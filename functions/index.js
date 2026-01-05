/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Translate } = require("@google-cloud/translate").v2;
const nodemailer = require('nodemailer');

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
                from: `"Radiology App" <${gmailEmail}>`,
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
                    <h2>¡Bienvenido a Radiology Training App!</h2>
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
                from: `"Administrador App Radiología UC" <${gmailEmail}>`,
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
