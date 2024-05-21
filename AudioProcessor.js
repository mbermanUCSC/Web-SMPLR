class AudioProcessor {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.originalBuffer = null;
        this.modifiedBuffer = null;
        this.sourceNode = null;
        this.filename = null;
        // Default values
        this.defaultSampleRate = 44100; // CD Quality
        this.defaultBitDepth = 16; // CD Quality bit depth
        this.currentPitch = 1.0;
    }

    loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => this.decodeAudio(e.target.result);
        reader.readAsArrayBuffer(file);
        this.filename = file.name;
    }

    decodeAudio(arrayBuffer) {
        this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
            this.originalBuffer = buffer;
            // Set initial sample rate and bit depth upon file load
            this.currentSampleRate = this.defaultSampleRate;
            this.currentBitDepth = this.defaultBitDepth;
            // Apply initial processing with default settings
            this.applyEffects();
            //console.log("Audio loaded and processed with default settings");
        }, (e) => {
            console.error('Error decoding file', e);
            // reset everything
            this.originalBuffer = null;
            this.modifiedBuffer = null;
            this.updateUI(null);
        });
    }

    exportWAV(buffer) {
        const interleaved = this.interleave(buffer);
        const dataView = this.encodeWAV(interleaved);
        return new Blob([dataView], { type: 'audio/wav' });
    }

    interleave(buffer) {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const result = new Float32Array(length * numberOfChannels);
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                result[i * numberOfChannels + channel] = buffer.getChannelData(channel)[i];
            }
        }
        return result;
    }

    encodeWAV(samples) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // RIFF identifier
        this.writeString(view, 0, 'RIFF');
        // RIFF chunk length
        view.setUint32(4, 36 + samples.length * 2, true);
        // RIFF type
        this.writeString(view, 8, 'WAVE');
        // format chunk identifier
        this.writeString(view, 12, 'fmt ');
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, 1, true);
        // channel count
        view.setUint16(22, 2, true);
        // sample rate
        view.setUint32(24, this.currentSampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, this.currentSampleRate * 4, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, 4, true);
        // bits per sample
        view.setUint16(34, 16, true);
        // data chunk identifier
        this.writeString(view, 36, 'data');
        // data chunk length
        view.setUint32(40, samples.length * 2, true);

        this.floatTo16BitPCM(view, 44, samples);

        return view;
    }

    floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    updatePitch(pitchFactor) {
        pitchFactor = Math.pow(2, pitchFactor / 12); // convert from semitones to pitch factor

        this.currentPitch = pitchFactor;
        this.applyEffects();
    }

    updateSampleRate(newRate) {
        this.currentSampleRate = newRate;
        this.applyEffects();
    }

    changeBitDepth(newBitDepth) {
        this.currentBitDepth = newBitDepth;
        this.applyEffects();
    }

    applyEffects() {
        if (!this.originalBuffer) return;

        // resample and change bit depth
        const resampledBuffer = this.resampleAndChangeBitDepth(this.originalBuffer, this.currentSampleRate, this.currentBitDepth);
        this.modifiedBuffer = resampledBuffer;
        this.updateUI(this.modifiedBuffer);
        // this.stopPlayback();
        // this.startPlayback();
    }

    resampleAndChangeBitDepth(buffer, targetSampleRate, newBitDepth) {
        const ratio = targetSampleRate / buffer.sampleRate;
        const numberOfChannels = buffer.numberOfChannels;
        const newLength = Math.round(buffer.length * ratio);
        const newBuffer = this.audioContext.createBuffer(numberOfChannels, newLength, targetSampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);
            const maxInt = Math.pow(2, newBitDepth) - 1;
            const scaleFactor = maxInt / 2;

            for (let i = 0; i < newLength; i++) {
                const srcIndex = i / ratio;
                const srcIndex0 = Math.floor(srcIndex);
                const srcIndex1 = Math.min(srcIndex0 + 1, buffer.length - 1);
                const sample0 = sourceData[srcIndex0];
                const sample1 = sourceData[srcIndex1];
                const interpolatedSample = sample0 + (sample1 - sample0) * (srcIndex - srcIndex0);
                newData[i] = Math.round(interpolatedSample * scaleFactor) / scaleFactor;
            }
        }

        return newBuffer;
    }

    startPlayback() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.modifiedBuffer;
        this.sourceNode.playbackRate.value = this.currentPitch;
        this.sourceNode.connect(this.audioContext.destination);
        this.sourceNode.start();
        //console.log('Playback started at pitch: ' + this.currentPitch);
    }

    stopPlayback() {
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            this.sourceNode = null;
            //console.log('Playback stopped');
        }
    }

    updateUI(buffer) {
        const canvas = document.getElementById('screen');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // canvas base
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.font = '12px "Press Start 2P"'; 
    
        // vertical position for drawing text
        let verticalPosition = 50; 
        const lineSpacing = 30; 
        
        // Title
        const maxTitleWidth = canvas.width - 20; 
        const title = this.truncateText(this.filename, ctx, maxTitleWidth);
        ctx.fillText(title, canvas.width / 2, verticalPosition);
        
        // Channels
        verticalPosition += lineSpacing; // down for next line
        const channelInfo = `Channels: ${buffer.numberOfChannels}`;
        ctx.fillText(channelInfo, canvas.width / 2, verticalPosition);
    
        // Length
        verticalPosition += lineSpacing;
        const lengthInfo = `Length: ${buffer.length} samples`;
        ctx.fillText(lengthInfo, canvas.width / 2, verticalPosition);

    
        //console.log(`File: ${this.filename}`);
        //console.log(`Sample rate: ${buffer.sampleRate}, Channels: ${buffer.numberOfChannels}, Length: ${buffer.length}`);
    }
    
    // Helper function to truncate text if it's too wide
    truncateText(text, ctx, maxWidth) {
        if (ctx.measureText(text).width > maxWidth) {
            while (ctx.measureText(text + '...').width > maxWidth) {
                text = text.slice(0, -1);
            }
            text += '...';
        }
        return text;
    }
    
    
}
