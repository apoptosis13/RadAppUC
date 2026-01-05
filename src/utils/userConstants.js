import avatar1 from '../assets/avatars/avatar_1.png';
import avatar2 from '../assets/avatars/avatar_2.png';
import avatar3 from '../assets/avatars/avatar_3.png';
import avatar4 from '../assets/avatars/avatar_4.png';
import avatar5 from '../assets/avatars/avatar_5.png';

export const AVATAR_STYLES = [
    'avataaars',
    'bottts',
    'identicon',
    'fun-emoji',
    'lorelei',
    'notionists'
];

export const AVATAR_PRESETS = [
    avatar1,
    avatar2,
    avatar3,
    avatar4,
    avatar5
];

export const getRandomAvatar = (seed = null) => {
    const styles = AVATAR_STYLES;
    const style = styles[Math.floor(Math.random() * styles.length)];
    const randomSeed = seed || Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/9.x/${style}/png?seed=${randomSeed}`;
};
