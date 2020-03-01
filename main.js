const fs = require('fs');
const path = require('path');


const tagMap = new Map([
    ['副', ['adv', 'adverb']],
    ['名', ['n', 'noun']],
    ['代', ['pn', 'pronoun']],
    ['形動', ['adj-na', 'adjectival nouns or quasi-adjectives']],
    ['感', ['int', 'interjection']]
]);

function getTags(tagString) {
    const parts = tagString.split(';');
    const tags = [];
    for (const part of parts) {
        const partEng = tagMap.get(part)[0];
        if (typeof partEng === 'undefined') {
            throw new Error(`Undefined part ${part}`);
        }
        tags.push(partEng);
    }
    return tags;
}

function createPitchData(pitchDataString, reading) {
    const pitches = [];

    const pitchDataLength = pitchDataString.length;
    const pattern = /(?:\(([^)]+)\))?(\d+)/g;
    let startIndex = 0;
    let m;
    while ((m = pattern.exec(pitchDataString)) !== null) {
        if (m.index !== startIndex) {
            throw new Error('Invalid format');
        }

        const tagString = m[1];
        const position = parseInt(m[2], 10);

        let tags;
        const pitch = {position};
        if (typeof tagString !== 'undefined') {
            tags = getTags(tagString);
        } else if (pitches.length > 0) {
            tags = pitches[pitches.length - 1].tags;
            if (Array.isArray(tags)) {
                tags = JSON.parse(JSON.stringify(tags)); // Clone
            }
        }
        if (Array.isArray(tags)) {
            pitch.tags = tags;
        }

        pitches.push(pitch);

        startIndex = m.index + m[0].length;
        if (startIndex >= pitchDataLength) {
            break; // End of string
        }
        if (pitchDataString[startIndex] !== ',') {
            throw new Error('Invalid format');
        }
        ++startIndex;
    }

    if (startIndex !== pitchDataLength) {
        throw new Error('Invalid format');
    }

    return {reading, pitches};
}


function main() {
    if (process.argv.length < 4) {
        process.stdout.write(`Usage:\n  node ${path.basename(process.argv[1])} <pitch-accent-input-file> <output-directory>\n`);
        return 1;
    }

    const inputFileName = process.argv[2];
    const outputDirectory = process.argv[3];

    // Read input
    const content = fs.readFileSync(inputFileName, {encoding: 'utf8'});
    const lines = content.trim().split(/\r?\n/);
    const input = [];
    for (let i = 0; i < lines.length; ++i) {
        const parts = lines[i].trim().split('\t');
        if (parts.length !== 3) {
            throw new Error(`Invalid format on line ${i + 1}`);
        }
        let [expression, reading, pitchDataString] = parts;
        if (pitchDataString[0] === ')') {
            pitchDataString = pitchDataString.substring(1); // Fix formatting issue
        }
        if (!(/^(\([^)\s]+\))?\d+(,(\([^)\s]+\))?\d+)*$/).test(pitchDataString) || reading.indexOf(':') >= 0 || pitchDataString.indexOf(':') >= 0) {
            throw new Error(`Invalid format on line ${i + 1}`);
        }
        expression = expression.trim();
        reading = reading.trim();
        const pitchData = createPitchData(pitchDataString, reading || expression);
        input.push([i, expression.normalize(), expression, pitchData]);
    }

    // Sort
    input.sort((a, b) => {
        if (a[1] < b[1]) { return -1; }
        if (a[1] > b[1]) { return 1; }
        if (a[2] < b[2]) { return -1; }
        if (a[2] > b[2]) { return 1; }
        return a[0] - b[0];
    });

    // Convert to data
    const mode = 'pitch';
    const data = input.map(([, , expression, pitchData]) => [expression, mode, pitchData]);
    const dataChunks = [];
    const dataChunkSize = 10000;
    for (let i = 0; i < data.length; i += dataChunkSize) {
        dataChunks.push(data.slice(i, i + dataChunkSize));
    }

    const dataTags = [...tagMap.values()].map(([name, notes]) => [name, 'partOfSpeech', 0, notes, 0]);

    const attribution = fs.readFileSync(path.join(__dirname, 'attribution.txt'), {encoding: 'utf8'}).replace(/\r\n/g, '\n');

    // Write
    const dirName = path.resolve(outputDirectory);
    try {
        fs.mkdirSync(dirName);
    } catch (e) {
        // NOP
    }

    for (let i = 0; i < dataChunks.length; ++i) {
        fs.writeFileSync(path.join(dirName, `term_meta_bank_${i + 1}.json`), JSON.stringify(dataChunks[i], null, 0), {encoding: 'utf8'});
    }

    fs.writeFileSync(path.join(dirName, 'tag_bank_1.json'), JSON.stringify(dataTags), {encoding: 'utf8'});

    const indexData = {
        title: 'Kanjium Pitch Accents',
        format: 3,
        revision: 'pitch1',
        sequenced: false,
        author: 'toasted-nutbread',
        url: 'https://github.com/toasted-nutbread/yomichan-pitch-accent-dictionary',
        description: 'This dictionary contains pitch accent information for a large variety of terms and expressions.',
        attribution
    };
    fs.writeFileSync(path.join(dirName, 'index.json'), JSON.stringify(indexData, null, 0), {encoding: 'utf8'});

    return 0;
}


if (require.main === module) { process.exit(main()); }
