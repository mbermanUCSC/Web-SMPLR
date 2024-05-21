
const UIController = (audioProcessor) => {
    const elements = {
        Sampler: document.getElementById('sampler'),
        fileInput: document.getElementById('load'),
        fileSave: document.getElementById('save'),
        sampleRateSlider: document.getElementById('rate'),
        sampleRateValueLabel: document.querySelector('label[for="rate"].value'),
        bitsSlider: document.getElementById('bits'),
        bitsValueLabel: document.querySelector('label[for="bits"].value'),
        pitchSlider: document.getElementById('detune'),
        pitchValueLabel: document.querySelector('label[for="detune"].value'),
        playButton: document.getElementById('play'),
        stopButton: document.getElementById('stop'),
        volumeSlider: document.getElementById('volume'),
        volumeValueLabel: document.querySelector('label[for="volume"].value'),
        // loopButton: document.getElementById('loop'),
        canvas: document.getElementById('screen'),
        waveform: document.getElementById('waveform'),
        settings_toggle: document.getElementById('settings_toggle'),
        controls: document.getElementById('controls'),
        settings: document.getElementById('settings'),
        colorWheel : document.getElementById('color')
    };

    // function to reset the UI elements
    const resetUI = () => {
        elements.fileInput.value = '';
        elements.sampleRateSlider.value = 44100;
        elements.sampleRateValueLabel.textContent = '44100 Hz';
        elements.bitsSlider.value = 16;
        elements.bitsValueLabel.textContent = '16 Bits';
        elements.pitchSlider.value = 0;
        elements.pitchValueLabel.textContent = '0';
    }

    // function to display the waveform (draw to waveform canvas)
    const displayWaveform = (buffer) => {
        const canvas = elements.waveform;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;
    
        ctx.fillStyle = 'rgb(143, 143, 143)';
        ctx.fillRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
    
        // Simplifying the drawing process by using a single path
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            const sampleStart = i * step;
            const sampleEnd = sampleStart + step;
    
            for (let j = sampleStart; j < sampleEnd; j++) {
                const datum = data[j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
    
            // Drawing lines from the minimum to the maximum value for this slice of the waveform
            const yMin = amp * (1 + min);
            const yMax = amp * (1 + max);
            ctx.moveTo(i, yMin);
            ctx.lineTo(i, yMax);
        }
        ctx.stroke();
    };

    
    const attachEventListeners = () => {
        elements.fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                audioProcessor.loadFile(file);
                resetUI();
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
        });

        elements.bitsSlider.addEventListener('input', () => {
            const newBits = parseFloat(elements.bitsSlider.value);
            // add leading 0s to the bits value if it's less than 10
            if (newBits < 10) {
                elements.bitsValueLabel.textContent = '0' + newBits + ' Bits';
            }
            else{
                elements.bitsValueLabel.textContent = newBits + ' Bits';
            }
        });

        elements.bitsSlider.addEventListener('change', () => {
            const newBits = parseFloat(elements.bitsSlider.value);
            audioProcessor.changeBitDepth(newBits);
        });

        elements.pitchSlider.addEventListener('input', () => {
            const newPitch = parseFloat(elements.pitchSlider.value);
            elements.pitchValueLabel.textContent = newPitch;
        });

        elements.pitchSlider.addEventListener('change', () => {
            const newPitch = parseFloat(elements.pitchSlider.value);
            audioProcessor.updatePitch(newPitch);
        });

        elements.playButton.addEventListener('click', () => {
            audioProcessor.startPlayback();
        });

        elements.stopButton.addEventListener('click', () => {
            audioProcessor.stopPlayback();
        });

        // volume slider
        elements.volumeSlider.addEventListener('input', () => {
            const newVolume = parseFloat(elements.volumeSlider.value);
            audioProcessor.updateVolume(newVolume);
            // add leading 0s to the volume value if it's less than 10
            if (newVolume < 0.1) {
                elements.volumeValueLabel.textContent = '0' + Math.round(newVolume * 100) + '%';
            } else {
                elements.volumeValueLabel.textContent = Math.round(newVolume * 100) + '%';
            }
        });

        // loop button
        // elements.loopButton.addEventListener('click', () => {
        //     audioProcessor.toggleLoop();
        // });


        // when canvas is clicked
        elements.canvas.addEventListener('click', () => {
            elements.canvas.style.display = 'none';
            elements.waveform.style.display = 'block';
            if (audioProcessor.modifiedBuffer){
                displayWaveform(audioProcessor.modifiedBuffer);
            }
        });

        // when waveform is clicked
        elements.waveform.addEventListener('click', () => {
            elements.waveform.style.display = 'none';
            elements.canvas.style.display = 'block';
        });

        // when settings button is clicked, turn on/off the settings panel
        elements.settings_toggle.addEventListener('click', () => {
            if (elements.controls.style.display === 'none') {
                elements.controls.style.display = 'flex';
                elements.settings.style.display = 'none';
            } else {
                elements.controls.style.display = 'none';
                elements.settings.style.display = 'grid';
            }
        });

        // set the background of the sampler to the color selected by the user
        elements.colorWheel.addEventListener('input', () => {
            const color = elements.colorWheel.value;
            elements.Sampler.style.backgroundColor = color;
        });
        
    };

    return {
        init: () => {
            attachEventListeners();

            // initially turn off the waveform display and sliders
            elements.waveform.style.display = 'none';
            elements.settings.style.display = 'none';
            
            elements.colorWheel.value = '#e7e7e7'; // default sample wheel color
        }
    };
};

const audioProcessor = new AudioProcessor();

function initializeCanvas() {
    // set canvas to "No file loaded"
    const canvas = document.getElementById('screen');
    if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        
        ctx.font = '16px "Press Start 2P"'; // Set the font, using the Press Start 2P font
        ctx.fillStyle = '#000000'; // Set text color
        ctx.textAlign = 'center'; // Align text to the center of the canvas
        ctx.fillText("No file loaded", canvas.width / 2, canvas.height / 2); // Draw text in the center
    }
    // set waveform to "No waveform to display"
    const waveform = document.getElementById('waveform');
    if (waveform.getContext) {
        const ctx = waveform.getContext('2d');
        ctx.clearRect(0, 0, waveform.width, waveform.height); // Clear the canvas
        
        ctx.font = '16px "Press Start 2P"'; // Set the font, using the Press Start 2P font
        ctx.fillStyle = '#000000'; // Set text color
        ctx.textAlign = 'center'; // Align text to the center of the canvas
        ctx.fillText("No waveform", waveform.width / 2, waveform.height / 2); // Draw text in the center
    }
}

// Event listener to initialize the canvas when the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    UIController(audioProcessor).init();
});
