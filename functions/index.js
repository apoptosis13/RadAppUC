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

const emailTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
    body { font-family: 'Inter', sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { height: 40px; }
    .content { background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    h2 { color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 24px; margin-top: 0; }
    p { font-size: 16px; line-height: 24px; margin-bottom: 16px; color: #374151; }
    .button { background-color: #4F46E5; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-top: 16px; }
    .footer { margin-top: 32px; font-size: 12px; color: #6B7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://radiology-app-v2.web.app/voxelhub-logo-full.png" alt="VoxelHub" class="logo">
    </div>
    <div class="content">
      <h2>${title}</h2>
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} VoxelHub. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
`;

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
                from: `"VoxelHub" <admin@voxelhub.cl>`,
                to: gmailEmail, // Sending to admin
                subject: `Nueva solicitud de rol: ${newData.displayName}`,
                html: emailTemplate('Nueva Solicitud de Acceso', `
                    <p>El usuario <strong>${newData.displayName}</strong> (${newData.email}) ha solicitado un nuevo rol en la plataforma.</p>
                    <p><strong>Rol solicitado:</strong> ${newData.requestedRole === 'instructor' || newData.requestedRole === 'admin' ? 'Instructor / Admin' : 'Alumno'}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CL')}</p>
                    <br>
                    <a href="https://console.firebase.google.com/" class="button">Gestionar en Firebase</a>
                `),
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
                subject = "🎉 ¡Bienvenido a VoxelHub!";
                htmlContent = emailTemplate('¡Tu cuenta ha sido aprobada!', `
                    <p>Hola <strong>${newData.displayName}</strong>,</p>
                    <p>Nos complace informarte que tu solicitud de acceso ha sido <strong>APROBADA</strong> por el equipo administrativo.</p>
                    <p>Ya tienes acceso completo a la plataforma de entrenamiento para residentes.</p>
                    <div style="text-align: center;">
                        <a href="https://radiology-app-v2.web.app/" class="button">Ingresar a la Plataforma</a>
                    </div>
                `);
            } else if (newData.status === 'rejected') {
                subject = "Actualización sobre tu solicitud";
                htmlContent = emailTemplate('Solicitud de Acceso', `
                    <p>Hola <strong>${newData.displayName}</strong>,</p>
                    <p>Lamentamos informarte que tu solicitud de acceso ha sido <strong>RECHAZADA</strong> por el administrador.</p>
                    <p>Si crees que esto es un error, por favor ponte en contacto con nosotros respondiendo a este correo.</p>
                `);
            } else {
                return null;
            }

            const mailOptions = {
                from: `"Administrador VoxelHub" <admin@voxelhub.cl>`,
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

exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const targetUserId = data.userId;
    const callerUid = context.auth.uid;
    const callerEmail = context.auth.token.email.toLowerCase();
    const SUPER_ADMIN_EMAIL = 'gonzalodiazs@gmail.com';

    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta el ID del usuario a eliminar.');
    }

    try {
        // 1. Get Caller Info
        const callerRef = admin.firestore().collection('users').doc(callerUid);
        const callerSnap = await callerRef.get();

        // If caller doc not found by UID, try by Email (legacy)
        let callerData = callerSnap.exists ? callerSnap.data() : null;
        if (!callerData) {
            const callerEmailRef = admin.firestore().collection('users').doc(callerEmail);
            const callerEmailSnap = await callerEmailRef.get();
            if (callerEmailSnap.exists) callerData = callerEmailSnap.data();
        }

        const isSuperAdmin = callerEmail === SUPER_ADMIN_EMAIL;
        const isCallerAdmin = callerData && (callerData.role === 'admin' || callerData.role === 'instructor');

        if (!isSuperAdmin && !isCallerAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'No tiene permisos para eliminar usuarios.');
        }

        // 2. Get Target Info
        const targetRef = admin.firestore().collection('users').doc(targetUserId);
        let targetSnap = await targetRef.get();
        // Try legacy lookup if needed
        if (!targetSnap.exists) {
            // Maybe targetUserId IS an email (legacy ID)
            const targetEmailRef = admin.firestore().collection('users').doc(targetUserId);
            targetSnap = await targetEmailRef.get();
        }

        if (!targetSnap.exists) {
            // Document doesn't exist, maybe already deleted from Authentication?
            // Just try to delete from Auth to be sure
            try {
                await admin.auth().deleteUser(targetUserId);
            } catch (e) { /* ignore */ }
            return { success: true, message: "Usuario no encontrado en base de datos, limpiado." };
        }

        const targetData = targetSnap.data();
        const targetEmail = targetData.email ? targetData.email.toLowerCase() : '';
        const targetRole = targetData.role || 'guest';

        // 3. Hierarchy Check

        // Rule: Super Admin cannot be deleted
        if (targetEmail === SUPER_ADMIN_EMAIL) {
            throw new functions.https.HttpsError('permission-denied', 'No se puede eliminar al Super Administrador.');
        }

        // Rule: Instructors cannot delete other Instructors/Admins (Only Super Admin can)
        if (!isSuperAdmin && (targetRole === 'admin' || targetRole === 'instructor')) {
            throw new functions.https.HttpsError('permission-denied', 'Los instructores solo pueden eliminar alumnos o invitados.');
        }

        // 4. Perform Deletion

        // A. Delete from Firestore
        await targetSnap.ref.delete();

        // B. Delete from Authentication (if UID is valid)
        // If the doc ID is not the UID, look for UID field
        const targetUid = targetData.uid || (targetSnap.id.includes('@') ? null : targetSnap.id);

        if (targetUid) {
            try {
                await admin.auth().deleteUser(targetUid);
            } catch (authError) {
                console.warn(`Could not delete auth user ${targetUid}:`, authError);
                // Continue, as firestore doc is deleted
            }
        }

        return { success: true };

    } catch (error) {
        console.error("Delete User Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
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

// --- AI QUIZ GENERATION ---
exports.generateQuizAI = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Only authenticated users can generate quizzes.'
        );
    }

    const { diagnosis, difficulty } = data;

    if (!diagnosis) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a "diagnosis" (pathology) argument.'
        );
    }

    const apiKey = functions.config().gemini?.key;
    if (!apiKey) {
        console.error("Gemini API key is missing in functions config.");
        throw new functions.https.HttpsError(
            'failed-precondition',
            'AI Service not configured.'
        );
    }

    // Map difficulty to Resident Year/Complexity
    let contextStr = "Residente de Radiología de 1er año (Conceptos básicos, anatomía, signos típicos).";
    if (difficulty === 'Intermediate') {
        contextStr = "Residente de Radiología de 2do año (Diagnóstico diferencial, variantes, complicaciones).";
    } else if (difficulty === 'Advanced') {
        contextStr = "Residente de Radiología de 3er año o Fellow (Casos complejos, manejo, estadificación, diagnóstico diferencial fino).";
    }

    const prompt = `
        Actúa como un profesor experto en Radiología.
        Genera un quiz de 10 preguntas de selección múltiple sobre la patología: "${diagnosis}".
        Nivel: ${contextStr}

        Requisitos:
        1. Las preguntas deben ser desafiantes y educativas.
        2. Enfócate en hallazgos por imagen, diagnóstico diferencial, asociaciones clínicas y fisiopatología relevante para la imagen.
        3. 4 alternativas por pregunta.
        4. Solo una alternativa correcta.
        5. Proporciona una explicación breve de por qué la correcta es correcta.

        Responde ESTRICTAMENTE en este formato JSON Array:
        [
            {
                "question": "Texto de la pregunta",
                "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
                "correctAnswer": 0, // Índice de la respuesta correcta (0-3)
                "explanation": "Explicación breve"
            },
            ...
        ]
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.candidates || !result.candidates[0]?.content?.parts[0]?.text) {
            throw new Error("No content in Gemini response");
        }

        const responseText = result.candidates[0].content.parts[0].text;

        // Ensure it's valid JSON
        const quizData = JSON.parse(responseText);

        return { quiz: quizData };

    } catch (error) {
        console.error("Generate Quiz Error:", error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to generate quiz.',
            { details: error.message }
        );
    }
});
