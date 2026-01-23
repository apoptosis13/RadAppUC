/**
 * Dictionary for automatic translation of legacy anatomy module titles.
 * Maps Spanish titles (stored in Firestore) to English.
 */
export const ANATOMY_TRANSLATIONS = {
    // Knee
    'RM rodilla': 'Knee MRI',
    'RM Rodilla': 'Knee MRI',
    'TC Rodilla': 'Knee CT',
    'Rx Rodilla': 'Knee X-Ray',

    // Brain / Head
    'TC Cerebro': 'Brain CT',
    'TC Cerebral': 'Brain CT',
    'RM Cerebro': 'Brain MRI',
    'RM Cerebral': 'Brain MRI',

    // Shoulder
    'RM Hombro': 'Shoulder MRI',
    'TC Hombro': 'Shoulder CT',

    // Spine
    'RM Columna Cervical': 'Cervical Spine MRI',
    'TC Columna Cervical': 'Cervical Spine CT',
    'RM Columna Lumbar': 'Lumbar Spine MRI',
    'TC Columna Lumbar': 'Lumbar Spine CT',

    // General
    'Miembro Superior': 'Upper Limb',
    'Miembro Inferior': 'Lower Limb',
    'Pared Toracoabdominal': 'Thoracoabdominal Wall',

    // New Modules
    'RM de pubis': 'Pubis MRI',
    'RM de pie': 'Foot MRI',
    'RM de tobillo': 'Ankle MRI',
    'RM de muñeca': 'Wrist MRI',
    'RM de codo': 'Elbow MRI'
};

/**
 * Helper to get the translated title/description based on current language.
 * Priority:
 * 1. CMS Manual Override (module.titleEn)
 * 2. Automatic Dictionary (ANATOMY_TRANSLATIONS)
 * 3. Raw Value (module.title)
 */
export const getLocalizedModuleField = (module, field, language) => {
    if (!module) return '';
    const isEnglish = language === 'en';

    if (isEnglish) {
        // 1. Check for manual English field in CMS data (e.g. titleEn)
        if (module[`${field}En`]) {
            return module[`${field}En`];
        }

        // 2. Check dictionary for Title
        if (field === 'title' && ANATOMY_TRANSLATIONS[module.title]) {
            return ANATOMY_TRANSLATIONS[module.title];
        }

        // 2b. Check dictionary for Region (special handling if region is stored as readable text instead of ID)
        // (Usually region is ID like 'upper-limb', handled by i18n, but just in case)
    }

    // 3. Return raw value (Spanish/Default)
    return module[field] || '';
};

/**
 * Translates a specific anatomical term from Spanish to English.
 * Currently uses a basic dictionary. Can be expanded or connected to an API.
 */
export const translateAnatomyTerm = (term) => {
    if (!term) return '';
    // Basic Dictionary expansion
    const dictionary = {
        'Fémur': 'Femur', 'Tibia': 'Tibia', 'Peroné': 'Fibula', 'Rótula': 'Patella',
        'Húmero': 'Humerus', 'Cúbito': 'Ulna', 'Radio': 'Radius', 'Clavícula': 'Clavicle',
        'Escápula': 'Scapula', 'Esternón': 'Sternum', 'Costilla': 'Rib', 'Vértebra': 'Vertebra',
        'Cráneo': 'Skull', 'Mandíbula': 'Mandible', 'Hígado': 'Liver', 'Riñón': 'Kidney',
        'Bazo': 'Spleen', 'Páncreas': 'Pancreas', 'Pulmón': 'Lung', 'Corazón': 'Heart',
        'Estómago': 'Stomach', 'Intestino': 'Intestine', 'Vejiga': 'Bladder', 'Próstata': 'Prostate',
        'Útero': 'Uterus', 'Ovario': 'Ovary', 'Músculo': 'Muscle', 'Tendón': 'Tendon',
        'Ligamento': 'Ligament', 'Nervio': 'Nerve', 'Arteria': 'Artery', 'Vena': 'Vein'
    };

    // Simple lookup (case insensitive)
    const key = Object.keys(dictionary).find(k => k.toLowerCase() === term.toLowerCase());
    return key ? dictionary[key] : '';
};
