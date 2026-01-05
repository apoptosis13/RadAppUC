import {
    Activity,
    Bone,
    Disc,
    CircleDot,
    Layers,
    AlignJustify,
    Droplet,
    Heart,
    Zap
} from 'lucide-react';

export const ANATOMY_CATEGORIES = [
    { id: 'general', label: 'Anatomía General', color: '#9CA3AF', icon: Activity },
    { id: 'bones', label: 'Huesos', color: '#E5E7EB', icon: Bone },
    { id: 'joints', label: 'Articulación', color: '#FCD34D', icon: Disc },
    { id: 'joint_cavity', label: 'Cavidad Articular', color: '#FDE047', icon: CircleDot },
    { id: 'fat_pad', label: 'Cuerpo Adiposo', color: '#FEF08A', icon: Layers },
    { id: 'menisci', label: 'Meniscos', color: '#60A5FA', icon: Disc },
    { id: 'ligaments', label: 'Ligamentos', color: '#34D399', icon: AlignJustify },
    { id: 'muscles', label: 'Músculos', color: '#F87171', icon: Activity },
    { id: 'tendons', label: 'Tendones', color: '#FB923C', icon: AlignJustify },
    { id: 'bursae', label: 'Bursas Sinoviales', color: '#A78BFA', icon: Droplet },
    { id: 'arteries', label: 'Arterias', color: '#EF4444', icon: Heart },
    { id: 'veins', label: 'Venas', color: '#3B82F6', icon: Heart },
    { id: 'nerves', label: 'Nervios', color: '#FBBF24', icon: Zap },
];
