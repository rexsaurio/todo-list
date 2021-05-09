const express = require('express');
const
const app = express();


app.get('/', (req, res) => {
    res.send('Hola mundo');
});
app.listen(3000);