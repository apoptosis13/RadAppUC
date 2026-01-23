/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Translate } = require("@google-cloud/translate").v2;
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
const { GoogleGenerativeAI } = require("@google/generative-ai");

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

    const { text, target, format } = data;

    if (!text || typeof text !== 'string') {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a "text" argument.'
        );
    }

    const targetLang = target || 'en';
    const textFormat = format || 'text'; // 'text' or 'html'

    try {
        const [translation] = await translate.translate(text, { to: targetLang, from: 'es', format: textFormat });
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
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Only authenticated users can request AI analysis.');

    const { userFindings, expertFindings, keywords } = data;
    if (!userFindings || !expertFindings) throw new functions.https.HttpsError('invalid-argument', 'Missing required arguments.');

    const apiKey = functions.config().gemini?.key;
    if (!apiKey) return { error: "AI_CONFIG_MISSING", score: 0, feedback: "Servicio de IA no configurado." };

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            Eres un experto radiólogo asistiendo en la evaluación de residentes. 
            Compara los "Hallazgos del Alumno" con los "Hallazgos del Experto".
            
            Hallazgos del Alumno: "${userFindings}"
            Hallazgos del Experto: "${expertFindings}"
            Palabras Clave Sugeridas: ${keywords ? keywords.join(", ") : "N/A"}
            
            Evalúa la precisión semántica y clínica.
            Responde estrictamente en formato JSON:
            {
                "score": (número entre 0 y 1),
                "matches": ["match1", "match2"],
                "misses": ["miss1"],
                "feedback": "Breve comentario."
            }
        `;

        const result = await model.generateContent(prompt, { generationConfig: { responseMimeType: "application/json" } });
        const responseText = result.response.text();

        return JSON.parse(responseText);

    } catch (error) {
        console.error("Gemini AI SDK Error:", error);
        return { error: "AI_EXECUTION_FAILED", message: error.message };
    }
});

// --- AI-POWERED FINDINGS ANALYSIS (HTTP VERSION FOR CORS RELIABILITY) ---
exports.analyzeFindingsAI_http = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const idToken = req.headers.authorization?.split('Bearer ')[1];
            if (!idToken) return res.status(401).send({ error: "UNAUTHENTICATED" });

            await admin.auth().verifyIdToken(idToken); // simple verify

            const { userFindings, expertFindings, keywords } = req.body.data || {};
            if (!userFindings || !expertFindings) return res.status(400).send({ error: "MISSING_DATA" });

            const apiKey = functions.config().gemini?.key;
            if (!apiKey) return res.status(500).send({ error: "AI_CONFIG_MISSING" });

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `Evalúa estos hallazgos:\nAlumno: ${userFindings}\nExperto: ${expertFindings}\nResponde JSON {score, matches, misses, feedback}`;

            const result = await model.generateContent(prompt, { generationConfig: { responseMimeType: "application/json" } });
            let responseText = result.response.text();

            // Sanitize response
            responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            res.json({ data: JSON.parse(responseText) });

        } catch (error) {
            console.error("HTTP AI Error:", error);
            res.status(500).json({ error: "INTERNAL_ERROR", message: error.message });
        }
    });
});

// --- AI QUIZ GENERATION ---
exports.generateQuizAI_v2 = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Only authenticated users.');
    const { diagnosis, difficulty, language } = data;
    if (!diagnosis) throw new functions.https.HttpsError('invalid-argument', 'Missing diagnosis.');

    const apiKey = functions.config().gemini?.key;
    if (!apiKey) throw new functions.https.HttpsError('failed-precondition', 'AI Not Configured');

    const isEnglish = language && language.startsWith('en');

    let contextStr = isEnglish ? "1st year Radiology Resident." : "Residente de Radiología de 1er año.";
    if (difficulty === 'Intermediate') contextStr = isEnglish ? "2nd year Radiology Resident." : "Residente de Radiología de 2do año.";
    else if (difficulty === 'Advanced') contextStr = isEnglish ? "3rd year Radiology Resident or Fellow." : "Residente de Radiología de 3er año o Fellow.";

    let prompt = "";

    if (isEnglish) {
        prompt = `
            Act as an expert Radiology Professor (Fellow/Subspecialist level).
            Generate a 10-question multiple-choice quiz about: "${diagnosis}".
            Target Audience: ${contextStr}

            Critical Requirements:
            1. Academic Precision: Questions must be technically rigorous.
            2. Logical Consistency (CRITICAL): The 'correctAnswer' index MUST strictly match the correct option described in the 'explanation'.
            3. Explanation: The 'explanation' must explicitly state why the correct option is correct and why the others are wrong.
            4. Format: Strict JSON Array: [{ "question": "...", "options": ["..."], "correctAnswer": 0, "explanation": "..." }]
            5. Language: Natural technical medical English.
        `;
    } else {
        prompt = `
            Actúa como un profesor experto en Radiología de nivel Fellow/Subespecialista.
            Genera un quiz de 10 preguntas de selección múltiple sobre: "${diagnosis}".
            Nivel del alumno: ${contextStr}

            Requisitos Críticos:
            1. Precisión Académica: Las preguntas deben ser técnicamente rigurosas.
            2. Consistencia Lógica (CRÍTICO): El índice 'correctAnswer' DEBE coincidir inequívocamente con la opción correcta descrita en 'explanation'.
            3. Explicación: La 'explanation' debe especificar explícitamente por qué la opción correcta es la correcta y por qué las demás son erróneas.
            4. Formato: JSON Array estricto: [{ "question": "...", "options": ["..."], "correctAnswer": 0, "explanation": "..." }]
            5. Lenguaje: Español técnico médico natural (Chile).
        `;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent(prompt, { generationConfig: { responseMimeType: "application/json" } });
        let responseText = result.response.text();

        // Sanitize response: remove markdown code fences if present
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return { quiz: JSON.parse(responseText) };

    } catch (error) {
        console.error("Generate Quiz Error:", error);

        // Diagnostic: List available models if 404 occurs
        let availableModels = "Unknown";
        try {
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResp.json();
            availableModels = listData.models ? listData.models.map(m => m.name).join(", ") : JSON.stringify(listData);
        } catch (listErr) {
            availableModels = "Failed to list: " + listErr.message;
        }

        throw new functions.https.HttpsError(
            'internal',
            `Failed. Error: ${error.message}. Available Models: ${availableModels}`,
            { details: error.message, models: availableModels }
        );
    }
});

// --- AI ANATOMY ANNOTATION ---
exports.detectAnatomyAI = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Only authenticated users.');

    const { imageUrl, region, plane, modality, hints, sequence, title, contextImages, referenceImageUrl, referenceImageBase64 } = data;
    if (!imageUrl) throw new functions.https.HttpsError('invalid-argument', 'Missing imageUrl.');

    const apiKey = functions.config().gemini?.key;
    if (!apiKey) throw new functions.https.HttpsError('failed-precondition', 'AI Not Configured');

    try {
        // 1. Fetch MAIN Image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Failed to fetch image from Storage");
        const arrayBuffer = await response.arrayBuffer();
        const mainBuffer = Buffer.from(arrayBuffer);
        const mainBase64 = mainBuffer.toString('base64');

        // 2. Prepare REFERENCE Image (Base64 OR URL)
        let referencePart = null;

        if (referenceImageBase64) {
            // Direct Base64 provided (from local upload)
            // Strip data:image/xyz;base64, prefix if present
            const cleanBase64 = referenceImageBase64.includes(",") ? referenceImageBase64.split(",")[1] : referenceImageBase64;
            referencePart = {
                inlineData: { data: cleanBase64, mimeType: "image/jpeg" }
            };
        } else if (referenceImageUrl) {
            // URL provided
            try {
                const refRes = await fetch(referenceImageUrl);
                if (refRes.ok) {
                    const contentType = refRes.headers.get("content-type");
                    if (!contentType || !contentType.startsWith("image/")) {
                        throw new Error("Invalid Content-Type for Reference URL: " + contentType + ". Did you provide a website link instead of an image link?");
                    }

                    const refAb = await refRes.arrayBuffer();
                    const refB64 = Buffer.from(refAb).toString('base64');
                    referencePart = {
                        inlineData: { data: refB64, mimeType: contentType || "image/jpeg" }
                    };
                }
            } catch (e) {
                console.warn("Failed to fetch reference image", e);
                throw new functions.https.HttpsError("invalid-argument", "Error descargando Imagen de Referencia: " + e.message);
            }
        }

        // 3. Fetch CONTEXT Images (if any)
        const contextParts = [];
        if (contextImages && Array.isArray(contextImages) && contextImages.length > 0) {
            const fetchPromises = contextImages.map(async (url) => {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const ab = await res.arrayBuffer();
                        const b64 = Buffer.from(ab).toString('base64');
                        return { inlineData: { data: b64, mimeType: "image/jpeg" } };
                    }
                } catch (e) {
                    console.warn("Failed to fetch context image", url, e);
                    return null;
                }
            });

            const results = await Promise.all(fetchPromises);
            results.forEach(part => {
                if (part) contextParts.push(part);
            });
        }

        // 4. Prepare AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const systemInstruction = `
            Role: Expert MSD (Musculoskeletal) Radiologist with Calibrated Vision.
            Task: Identify the MOST IMPORTANT and CLEARLY VISIBLE anatomical structures within the visible tissue.

            Instructions:
            1. **Reference Image**: Use it ONLY for accurate naming of structures. Ignore its position/zoom.
            2. **STEP 1: FIND THE TISSUE (BOUNDING BOX)**:
               - Scan the Target Image.
               - Ignore the black background. Find the rectangular area containing the visible anatomy.
               - Output \`tissue_bounding_box\` (absolute 0-1000 coordinates).
            3. **STEP 2: LOCATE STRUCTURES (RELATIVE)**:
               - Identify the top 8-10 structures inside that anatomical blob.
               - **CRITICAL**: The \`x\` and \`y\` for these structures must be **RELATIVE TO THE BOUNDING BOX** (0.0 to 1.0).
               - \`x=0.0\` is the left edge of the TISSUE, not the image.
               - \`x=1.0\` is the right edge of the TISSUE.
               - \`y=0.0\` is the top edge of the TISSUE.
               - \`y=1.0\` is the bottom edge of the TISSUE.
            
            Output format: JSON { 
                "tissue_bounding_box": { "y_min": 0, "y_max": 1000, "x_min": 0, "x_max": 1000 },
                "structures": [ { "label": "...", "x": 0.5, "y": 0.5, "category": "..." } ] 
            }
            categories: [bones, joints, muscles, ligaments, tendons, menisci, arteries, veins, nerves, other]
        `;

        const mainImagePart = {
            inlineData: {
                data: mainBase64,
                mimeType: "image/jpeg"
            },
        };

        const contentParts = [];

        // System / Intro
        contentParts.push(systemInstruction);

        // Reference
        if (referencePart) {
            contentParts.push("REFERENCE IMAGE (ATLAS) - Use this for anatomical guidance:");
            contentParts.push(referencePart);
        }

        // Context
        if (contextParts.length > 0) {
            contentParts.push("CONTEXT IMAGES (Previous slices in stack):");
            contentParts.push(...contextParts);
        }

        // Target
        contentParts.push("TARGET IMAGE (Annotate THIS image):");
        contentParts.push(mainImagePart);

        const result = await model.generateContent(contentParts, { generationConfig: { responseMimeType: "application/json" } });
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const content = JSON.parse(text);
        const bbox = content.tissue_bounding_box;

        // Projection: Convert Relative (Box Space) -> Absolute (Image Space)
        if (content.structures && bbox) {
            const boxW = bbox.x_max - bbox.x_min;
            const boxH = bbox.y_max - bbox.y_min;

            content.structures = content.structures.map(s => {
                // Calculate absolute 0-1000
                const absX = bbox.x_min + (s.x * boxW);
                const absY = bbox.y_min + (s.y * boxH);

                // Normalize to 0-1 for Client
                return {
                    ...s,
                    x: Math.min(Math.max(absX / 1000, 0), 1),
                    y: Math.min(Math.max(absY / 1000, 0), 1)
                };
            });
        } else if (content.structures) {
            // Fallback (should not happen if AI follows instructions)
            content.structures = content.structures.map(s => ({
                ...s,
                x: Math.min(Math.max(s.x / 1000, 0), 1),
                y: Math.min(Math.max(s.y / 1000, 0), 1)
            }));
        }

        return content;

    } catch (error) {
        console.error("Detect Anatomy Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

exports.revokeUserSessions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const uid = context.auth.uid;

    try {
        await admin.auth().revokeRefreshTokens(uid);
        console.log(`User ${uid} tokens revoked.`);
        return { success: true, message: "Todas las sesiones han sido cerradas. Deberá iniciar sesión nuevamente." };
    } catch (error) {
        console.error("Revoke Tokens Error:", error);
        throw new functions.https.HttpsError('internal', 'Error al cerrar sesiones.', error);
    }
});
