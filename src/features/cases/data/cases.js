export const cases = [
    {
        titleKey: 'cases.data.case1.title',
        historyKey: 'cases.data.case1.history',
        modality: 'MRI',
        difficulty: 'Intermediate',
        image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=800&h=600',
        correctDiagnosisKey: 'cases.data.case1.correctDiagnosis',
        findingsKey: 'cases.data.case1.findings',
        diagnosisAliases: ['Desgarro del LCA', 'Rotura de LCA', 'Rotura de ligamento cruzado anterior', 'ACL tear', 'LCA'],
        findingKeywords: ['disrupción', 'edema', 'fibras', 'ligamento'],
        questions: [
            {
                text: "¿Cuál es la estructura anatómica lesionada?",
                options: ["Menisco medial", "Ligamento cruzado anterior", "Ligamento colateral medial", "Tendón rotuliano"],
                correctAnswer: 1
            },
            {
                text: "¿Qué hallazgo secundario suele asociarse a esta lesión?",
                options: ["Fractura de Segond", "Fractura de Maisonneuve", "Fractura de Jones", "Fractura de Smith"],
                correctAnswer: 0
            }
        ],
        questions_en: [
            {
                text: "Which anatomical structure is injured?",
                options: ["Medial meniscus", "Anterior cruciate ligament", "Medial collateral ligament", "Patellar tendon"],
                correctAnswer: 1
            },
            {
                text: "What secondary finding is often associated with this injury?",
                options: ["Segond fracture", "Maisonneuve fracture", "Jones fracture", "Smith fracture"],
                correctAnswer: 0
            }
        ]
    },
    {
        titleKey: 'cases.data.case2.title',
        historyKey: 'cases.data.case2.history',
        modality: 'X-Ray',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=800&h=600',
        correctDiagnosisKey: 'cases.data.case2.correctDiagnosis',
        findingsKey: 'cases.data.case2.findings',
        diagnosisAliases: ['Neumonía', 'Neumonia', 'Consolidación', 'Pneumonia'],
        findingKeywords: ['opacificación', 'consolidación', 'lóbulo inferior'],
        questions: [
            {
                text: "¿Cuál es el signo radiológico principal?",
                options: ["Neumotórax", "Derrame pleural masivo", "Consolidación lobar", "Nódulo pulmonar"],
                correctAnswer: 2
            },
            {
                text: "¿Qué signo de la silueta esperaría encontrar?",
                options: ["Borramiento del borde cardiaco derecho", "Borramiento del botón aórtico", "Borramiento del hemidiafragma izquierdo", "Ninguno"],
                correctAnswer: 0
            }
        ],
        questions_en: [
            {
                text: "What is the main radiological sign?",
                options: ["Pneumothorax", "Massive pleural effusion", "Lobar consolidation", "Pulmonary nodule"],
                correctAnswer: 2
            },
            {
                text: "What silhouette sign would you expect to find?",
                options: ["Obliteration of the right heart border", "Obliteration of the aortic knob", "Obliteration of the left hemidiaphragm", "None"],
                correctAnswer: 0
            }
        ]
    },
    {
        titleKey: 'cases.data.case3.title',
        historyKey: 'cases.data.case3.history',
        modality: 'CT',
        difficulty: 'Advanced',
        image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=800&h=600',
        correctDiagnosisKey: 'cases.data.case3.correctDiagnosis',
        findingsKey: 'cases.data.case3.findings',
        diagnosisAliases: ['Hemorragia Subaracnoidea', 'HSA', 'Subarachnoid Hemorrhage'],
        findingKeywords: ['hiperdenso', 'cisternas', 'subaracnoideo'],
        questions: [
            {
                text: "¿Cuál es la causa más probable de este hallazgo en un paciente joven sin trauma?",
                options: ["Ruptura de aneurisma", "Malformación arteriovenosa", "Angiopatía amiloide", "Trombosis venosa"],
                correctAnswer: 0
            },
            {
                text: "¿Qué escala se utiliza para clasificar la severidad radiológica?",
                options: ["Escala de Glasgow", "Escala de Fisher", "Escala de Hunt y Hess", "Escala de ASPECTS"],
                correctAnswer: 1
            }
        ],
        questions_en: [
            {
                text: "What is the most likely cause of this finding in a young patient without trauma?",
                options: ["Aneurysm rupture", "Arteriovenous malformation", "Amyloid angiopathy", "Venous thrombosis"],
                correctAnswer: 0
            },
            {
                text: "Which scale is used to classify radiological severity?",
                options: ["Glasgow Scale", "Fisher Scale", "Hunt and Hess Scale", "ASPECTS Scale"],
                correctAnswer: 1
            }
        ]
    },
];
