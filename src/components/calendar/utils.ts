
import { Log } from "@/lib/store";

export const getLogIcon = (log: Log) => {
    switch (log.type) {
        case 'feeding': return log.emoji || '🦗';
        case 'poop': return '💩';
        case 'cleaning': return '🧹';
        case 'memo': return '📝';
        case 'weight': return '⚖️';
        case 'misting': return '🚿';
        default: return log.type;
    }
};
