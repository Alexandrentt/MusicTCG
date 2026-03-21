import { toPng, toJpeg } from 'html-to-image';

export async function shareCardAsImage(elementId: string, fileName: string = 'music-card', format: 'png' | 'jpeg' = 'png') {
    const node = document.getElementById(elementId);
    if (!node) {
        console.error('Element not found');
        return;
    }

    try {
        const dataUrl = format === 'png'
            ? await toPng(node, { quality: 0.95, cacheBust: true })
            : await toJpeg(node, { quality: 0.95, cacheBust: true });

        // Intentar usar Web Share API
        if (navigator.share) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], `${fileName}.${format}`, { type: `image/${format}` });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'MusicTCG Card',
                        text: '¡Mira esta carta que encontré en MusicTCG!'
                    });
                    return dataUrl;
                }
            } catch (shareErr) {
                console.warn('Share API failed or user cancelled, falling back to download.', shareErr);
            }
        }

        // Fallback a descarga normal
        const link = document.createElement('a');
        link.download = `${fileName}.${format}`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (err) {
        console.error('Failed to share card', err);
        throw err;
    }
}
