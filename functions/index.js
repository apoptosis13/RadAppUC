/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Translate } = require("@google-cloud/translate").v2;
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const translate = new Translate();

exports.translateCase = functions.firestore
    .document("cases/{caseId}")
    .onWrite(async (change, context) => {
        const data = change.after.exists ? change.after.data() : null;
        const previousData = change.before.exists ? change.before.data() : null;

        // Exit if document was deleted
        if (!data) return null;

        // Detect changes in source (Spanish) fields
        const questionsChanged = JSON.stringify(data.questions) !== JSON.stringify(previousData?.questions);
        const historyChanged = data.history !== previousData?.history;
        const titleChanged = data.title !== previousData?.title;
        const findingsChanged = data.findings !== previousData?.findings;
        const diagnosisChanged = data.correctDiagnosis !== previousData?.correctDiagnosis;

        // Detect changes in target (English) fields - Manual Overrides
        // If these changed in the same write, we assume the user manually updated them
        const questionsEnChanged = JSON.stringify(data.questions_en) !== JSON.stringify(previousData?.questions_en);
        const historyEnChanged = data.history_en !== previousData?.history_en;
        const titleEnChanged = data.title_en !== previousData?.title_en;
        const findingsEnChanged = data.findings_en !== previousData?.findings_en;
        const diagnosisEnChanged = data.correctDiagnosis_en !== previousData?.correctDiagnosis_en;

        const updates = {};
        const target = 'en';

        try {
            // Translate Title
            // Condition: Title exists AND (English missing OR Spanish changed) AND (English NOT manually changed)
            if (data.title && (!data.title_en || titleChanged) && !titleEnChanged) {
                const [translation] = await translate.translate(data.title, target);
                updates.title_en = translation;
            }

            // Translate History
            if (data.history && (!data.history_en || historyChanged) && !historyEnChanged) {
                const [translation] = await translate.translate(data.history, target);
                updates.history_en = translation;
            }

            // Translate Findings
            if (data.findings && (!data.findings_en || findingsChanged) && !findingsEnChanged) {
                const [translation] = await translate.translate(data.findings, target);
                updates.findings_en = translation;
            }

            // Translate Diagnosis
            if (data.correctDiagnosis && (!data.correctDiagnosis_en || diagnosisChanged) && !diagnosisEnChanged) {
                const [translation] = await translate.translate(data.correctDiagnosis, target);
                updates.correctDiagnosis_en = translation;
            }

            // Translate Questions (Complex Array)
            const questionsEnIsEmpty = !data.questions_en || (Array.isArray(data.questions_en) && data.questions_en.every(q => !q.text || !q.text.trim()));
            const questionsManualOverride = questionsEnChanged && !questionsEnIsEmpty;

            if (data.questions && Array.isArray(data.questions) &&
                (questionsEnIsEmpty || questionsChanged) &&
                !questionsManualOverride) {

                const translatedQuestions = [];
                for (const q of data.questions) {
                    const newQ = { ...q };

                    // Translate text
                    if (q.text) {
                        const [tText] = await translate.translate(q.text, target);
                        newQ.text = tText;
                    }

                    // Translate options
                    if (q.options && Array.isArray(q.options)) {
                        const newOptions = [];
                        for (const opt of q.options) {
                            const [tOpt] = await translate.translate(opt, target);
                            newOptions.push(tOpt);
                        }
                        newQ.options = newOptions;
                    }
                    translatedQuestions.push(newQ);
                }
                updates.questions_en = translatedQuestions;
            }

            // Translate Learning Objectives (Array)
            const objectivesChanged = JSON.stringify(data.learningObjectives) !== JSON.stringify(previousData?.learningObjectives);
            const objectivesEnChanged = JSON.stringify(data.learningObjectives_en) !== JSON.stringify(previousData?.learningObjectives_en);

            const objectivesEnIsEmpty = !data.learningObjectives_en || (Array.isArray(data.learningObjectives_en) && data.learningObjectives_en.every(o => !o || !o.trim()));
            const objectivesManualOverride = objectivesEnChanged && !objectivesEnIsEmpty;

            if (data.learningObjectives && Array.isArray(data.learningObjectives) &&
                (objectivesEnIsEmpty || objectivesChanged) &&
                !objectivesManualOverride) {

                const translatedObjectives = [];
                for (const obj of data.learningObjectives) {
                    if (obj) {
                        const [tObj] = await translate.translate(obj, target);
                        translatedObjectives.push(tObj);
                    } else {
                        translatedObjectives.push('');
                    }
                }
                updates.learningObjectives_en = translatedObjectives;
            }

            // Only update if we have something to write
            if (Object.keys(updates).length > 0) {
                return change.after.ref.update(updates);
            }

            return null;

        } catch (error) {
            console.error("Error translating case:", error);
            return null;
        }
    });

const gmailEmail = functions.config().gmail?.email || "gonzalodiazs@gmail.com";
const gmailPassword = functions.config().gmail?.password;

const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

// Callable Function for on-demand translation from Frontend
exports.translateText = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Only authenticated users can request translations.'
        );
    }

    const { text, target } = data;

    if (!text || typeof text !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a "text" argument.'
        );
    }

    const targetLang = target || 'en';

    try {
        const [translation] = await translate.translate(text, targetLang);
        return { translation };
    } catch (error) {
        console.error("Translation API Error:", error);
        throw new functions.https.HttpsError(
            'internal',
            'Translation failed.',
            error
        );
    }
});

exports.notifyRoleRequest = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        // Check if requestedRole changed and is not empty
        // Also check if status is pending to avoid spam if just updating other fields
        if (newData.requestedRole && newData.requestedRole !== previousData.requestedRole) {

            if (!gmailPassword) {
                console.log("No Gmail password configured. Skipping email sending.");
                console.log(`[MOCK EMAIL] To: ${gmailEmail}, Subject: New Role Request for ${newData.displayName}`);
                return null;
            }

            const mailOptions = {
                from: `"VoxelHub" <${gmailEmail}>`,
                to: gmailEmail, // Sending to admin
                subject: `Nueva solicitud de rol: ${newData.displayName}`,
                html: `
                    <h2>Nueva solicitud de acceso</h2>
                    <p><strong>Usuario:</strong> ${newData.displayName} (${newData.email})</p>
                    <p><strong>Rol solicitado:</strong> ${newData.requestedRole}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                    <br>
                    <p>Por favor ingrese a la consola de Firebase para aprobar o rechazar.</p>
                `,
            };

            try {
                await mailTransport.sendMail(mailOptions);
                console.log('Role request email sent to:', gmailEmail);
            } catch (error) {
                console.error('There was an error while sending the email:', error);
            }
        }
        return null;
    });

exports.notifyUserStatusChange = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        // Check if status changed
        if (newData.status !== previousData.status) {

            if (!gmailPassword) {
                console.log("No Gmail password configured. Skipping email sending.");
                return null;
            }

            let subject = "";
            let htmlContent = "";

            if (newData.status === 'approved') {
                subject = "🎉 ¡Bienvenido! Tu cuenta ha sido aprobada";
                htmlContent = `
                    <h2>¡Bienvenido a VoxelHub!</h2>
                    <p>Hola <strong>${newData.displayName}</strong>,</p>
                    <p>Nos complace informarte que tu solicitud de acceso ha sido <strong>APROBADA</strong>.</p>
                    <p>Ya puedes iniciar sesión en la plataforma con tu cuenta de Google.</p>
                    <br>
                    <a href="https://radiology-app-v2.web.app/" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a la Aplicación</a>
                `;
            } else if (newData.status === 'rejected') {
                subject = "Actualización sobre tu solicitud de acceso";
                htmlContent = `
                    <h2>Solicitud de Acceso</h2>
                    <p>Hola <strong>${newData.displayName}</strong>,</p>
                    <p>Lamentamos informarte que tu solicitud de acceso ha sido <strong>RECHAZADA</strong> por el administrador.</p>
                    <p>Si crees que esto es un error, por favor ponte en contacto con la administración.</p>
                `;
            } else {
                return null;
            }

            const mailOptions = {
                from: `"Administrador VoxelHub" <${gmailEmail}>`,
                to: newData.email,
                subject: subject,
                html: htmlContent,
            };

            try {
                await mailTransport.sendMail(mailOptions);
                console.log(`Status change email sent to: ${newData.email} (${newData.status})`);
            } catch (error) {
                console.error('Error sending status change email:', error);
            }
        }
        return null;
    });

// --- DEBUG & CONNECTIVITY ---
exports.pingAI = functions.https.onCall((data, context) => {
    return { status: "ok", message: "AI function is reachable", timestamp: new Date().toISOString() };
});

// --- AI-POWERED FINDINGS ANALYSIS ---
exports.analyzeFindingsAI = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Only authenticated users can request AI analysis.'
        );
    }

    const { userFindings, expertFindings, keywords } = data;

    if (!userFindings || !expertFindings) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required arguments: userFindings or expertFindings.'
        );
    }

    const apiKey = functions.config().gemini?.key;
    if (!apiKey) {
        console.error("Gemini API key is missing in functions config.");
        return {
            error: "AI_CONFIG_MISSING",
            score: 0,
            feedback: "El servicio de IA no está configurado en el servidor. Contacte al administrador."
        };
    }

    try {
        console.log("Starting AI analysis for findings...");

        const prompt = `
            Eres un experto radiólogo asistiendo en la evaluación de residentes. 
            Compara los "Hallazgos del Alumno" con los "Hallazgos del Experto".
            
            Hallazgos del Alumno: "${userFindings}"
            Hallazgos del Experto: "${expertFindings}"
            Palabras Clave Sugeridas: ${keywords ? keywords.join(", ") : "N/A"}
            
            Evalúa la precisión semántica y clínica, no solo la coincidencia exacta de palabras.
            Responde estrictamente en formato JSON con la siguiente estructura:
            {
                "score": (número entre 0 y 1, donde 1 es perfecto),
                "matches": ["concepto detectado 1", "concepto detectado 2"],
                "misses": ["concepto omitido importante 1"],
                "feedback": "Breve comentario constructivo en español (máximo 2 frases)."
            }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        functions.logger.log("Gemini API call made. Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini REST API Error Response:", errorText);
            throw new Error(`Error de la API de Gemini (${response.status})`);
        }

        const result = await response.json();

        if (!result.candidates || !result.candidates[0]?.content?.parts[0]?.text) {
            console.error("Unexpected Gemini response structure:", JSON.stringify(result));
            throw new Error("Respuesta inesperada de la IA.");
        }

        const responseText = result.candidates[0].content.parts[0].text;

        try {
            return JSON.parse(responseText);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Response text:", responseText);
            throw new Error("La IA devolvió un formato inválido.");
        }

    } catch (error) {
        console.error("Gemini AI Error:", error);
        return {
            error: "AI_EXECUTION_FAILED",
            message: error.message || "Error desconocido en la ejecución de la IA",
            details: error.toString()
        };
    }
});

// --- AI-POWERED FINDINGS ANALYSIS (HTTP VERSION FOR CORS RELIABILITY) ---
exports.analyzeFindingsAI_http = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            // Manual Auth check (using ID Token in Authorization header)
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) {
                return res.status(401).send({ error: "UNAUTHENTICATED" });
            }

            // Verify token
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            if (!decodedToken) {
                return res.status(401).send({ error: "INVALID_AUTH" });
            }

            const { userFindings, expertFindings, keywords } = req.body.data || {};
            if (!userFindings || !expertFindings) {
                return res.status(400).send({ error: "MISSING_DATA" });
            }

            const apiKey = functions.config().gemini?.key;
            if (!apiKey) {
                return res.status(500).send({ error: "AI_CONFIG_MISSING" });
            }

            const prompt = `Evalúa estos hallazgos:\nAlumno: ${userFindings}\nExperto: ${expertFindings}\nResponde JSON {score, matches, misses, feedback}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                return res.status(500).send({ error: "AI_API_ERROR", details: err });
            }

            const result = await response.json();
            const responseText = result.candidates[0].content.parts[0].text;
            res.json({ data: JSON.parse(responseText) });

        } catch (error) {
            console.error("HTTP AI Error:", error);
            res.status(500).json({ error: "INTERNAL_ERROR", message: error.message });
        }
    });
});
