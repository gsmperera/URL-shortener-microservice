require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
    res.json({ greeting: 'hello API' });
});

const urlSchema = new mongoose.Schema({
    original_url: String,
    short_url: Number,
});

const UrlModel = mongoose.model('UrlModel', urlSchema);

async function getCurrentMaxShortUrl() {
    const short = await UrlModel.findOne().sort({ short_url: -1 });
    if (short) return short.short_url;
    return 0;
}

async function createAndSaveNewUrl(url, done) {
    const currentUrl = await getCurrentMaxShortUrl();

    const newUrl = new UrlModel({
        original_url: url,
        short_url: currentUrl + 1,
    });

    newUrl.save(function (err, savedUrl) {
        if (err) return console.error(err);
        done(null, savedUrl);
    });
}

function findOriginalUrl(short_url, done) {
    UrlModel.findOne({ short_url: short_url }, function (err, urlFound) {
        if (err) return console.error(err);
        done(null, urlFound);
    });
}

app.post('/api/shorturl', function (req, res) {
    const regEx = /http(s?)?:\/\/w{3}\.?\w+\.\S*/;

    if (!regEx.test(req.body.url)) {
        res.json({
            error: 'invalid url',
        });
        return console.log('invalid url');
    }

    createAndSaveNewUrl(req.body.url, function (err, savedUrl) {
        if (err) return console.error(err);
        res.json({
            original_url: savedUrl.original_url,
            short_url: savedUrl.short_url,
        });
    });
});

app.get('/api/shorturl/:shorturl', function (req, res) {
    findOriginalUrl(req.params.shorturl, function (err, urlFound) {
        if (err) return console.error(err);
        res.redirect(urlFound.original_url);
    });
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
