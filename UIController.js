const UIController = (audioProcessor) => {
    const elements = {
        fileInput: document.getElementById('load'),
        fileSave: document.getElementById('save'),
        sampleRateSlider: document.getElementById('rate'),
        sampleRateValueLabel: document.querySelector('label[for="rate"].value'),
        bitsSlider: document.getElementById('bits'),
        bitsValueLabel: document.querySelector('label[for="bits"].value'),
        pitchSlider: document.getElementById('detune'),
        pitchValueLabel: document.querySelector('label[for="detune"].value'),
        playButton: document.getElementById('play'),
        stopButton: document.getElementById('stop')
    };

    const attachEventListeners = () => {
        elements.fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                audioProcessor.loadFile(file);
            }
        });

       // when click save button, save the modified audio file
        elements.fileSave.addEventListener('click', () => {
            console.log('Save button clicked');
            if (audioProcessor.modifiedBuffer) {
                const wavBlob = audioProcessor.exportWAV(audioProcessor.modifiedBuffer);
                const url = URL.createObjectURL(wavBlob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = url;
                a.download = audioProcessor.filename + '[' + audioProcessor.currentSampleRate + 'Hz, ' + audioProcessor.currentBitDepth + 'bit, ' + audioProcessor.currentPitch + 'ST].wav';
                a.click();
                window.URL.revokeObjectURL(url);
            }
        });

        elements.sampleRateSlider.addEventListener('input', () => {
            const newRate = parseFloat(elements.sampleRateSlider.value);
            elements.sampleRateValueLabel.textContent = newRate + ' Hz';
        });

        elements.sampleRateSlider.addEventListener('change', () => {
            const newRate = parseFloat(elements.sampleRateSlider.value);
            audioProcessor.updateSampleRate(newRate);
            audioProcessor.stopPlayback();
            audioProcessor.startPlayback();
        });

        elements.bitsSlider.addEventListener('input', () => {
            const newBits = parseFloat(elements.bitsSlider.value);
            elements.bitsValueLabel.textContent = newBits + ' Bits';
        });

        elements.bitsSlider.addEventListener('change', () => {
            const newBits = parseFloat(elements.bitsSlider.value);
            audioProcessor.changeBitDepth(newBits);
            audioProcessor.stopPlayback();
            audioProcessor.startPlayback();
        });

        elements.pitchSlider.addEventListener('input', () => {
            const newPitch = parseFloat(elements.pitchSlider.value);
            elements.pitchValueLabel.textContent = newPitch;
        });

        elements.pitchSlider.addEventListener('change', () => {
            const newPitch = parseFloat(elements.pitchSlider.value);
            audioProcessor.updatePitch(newPitch);
            audioProcessor.stopPlayback();
            audioProcessor.startPlayback();
        });

        elements.playButton.addEventListener('click', () => {
            audioProcessor.startPlayback();
        });

        elements.stopButton.addEventListener('click', () => {
            audioProcessor.stopPlayback();
        });
    };

    return {
        init: () => {
            attachEventListeners();
        }
    };
};

const audioProcessor = new AudioProcessor();

function initializeCanvas() {
    const canvas = document.getElementById('screen');
    if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        
        ctx.font = '16px "Press Start 2P"'; // Set the font, using the Press Start 2P font
        ctx.fillStyle = '#ffffff'; // Set text color
        ctx.textAlign = 'center'; // Align text to the center of the canvas
        ctx.fillText("No file loaded", canvas.width / 2, canvas.height / 2); // Draw text in the center
    }
}

// Event listener to initialize the canvas when the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    UIController(audioProcessor).init();
});
