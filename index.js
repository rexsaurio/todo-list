const express = require('express');
const expressLogs = require('express-logs');
const mysql = require('mysql2/promise');
const db_config = require('./db.config');

const app = express();
const pool = mysql.createPool(db_config);
const port = process.env.PORT || 3000;


app.use(express.json());
app.use(expressLogs());

app.get('/notes', async (req, res) => {
    let conn
    try {
        conn = await pool.getConnection();
        const [notes] = await conn.query('SELECT * FROM tbl_notes')
        return res.send(notes)
    }
    catch (e) {
        console.log(e)
        res.statusCode = 500
        return res.send({
            error: e
        })
    }
    finally {
        if (conn) await conn.release()
    }
});

app.get('/notes/:id', async (req, res) => {
    const { id } = req.params;
    let conn
    try {
        conn = await pool.getConnection()
        const [[note]] = await conn.query('select * from tbl_notes where pk_note = ?', [id])
        if (!note) throw { domainError: 'note_not_found' }
        return res.send(note)
    }
    catch (e) {
        if ('domainError' in e) {
            if (e.domainError === 'note_not_found') {
                res.statusCode = 404
                return res.send({
                    statusCode: 404,
                    statusMessage: 'resource not found',
                    data: null,
                })
            }
        }
        res.statusCode = 500
        return res.send({
            error: e
        })
    }
    finally {
        if (conn) await conn.release();
    }
})

app.post('/notes', async (req, res) => {
    req.logs.log('Create note request start.')
    const note = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const result = await conn.query('INSERT INTO tbl_notes (title,body) VALUES (?,?)', [note.title, note.body]);
        await conn.commit()
        const [{ insertId }] = result
        return res.send({
            note,
            insertId
        });
    } catch (e) {
        await conn.rollback();
        res.statusCode = 500;
        return res.send({
            error: e
        });
    }
    finally {
        if (conn) await conn.release();
    }
});

app.put('/notes/:id', async (req, res) => {
    const { id } = req.params;
    const item = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        const [[note]] = await conn.query('SELECT * from tbl_notes where pk_note = ?', [id]);
        if (!note) throw { domainError: 'note_not_found' };
        await conn.beginTransaction();
        await conn.query("UPDATE tbl_notes SET title = ?,body = ? WHERE pk_note = ?", [item.title, item.body, id]);
        await conn.commit();
        res.statusCode = 200;
        return res.send(item);
    } catch (e) {
        await conn.rollback()
        if ('domainError' in e) {
            if (e.domainError === 'note_not_found') {
                res.statusCode = 404;
                return res.send({
                    statusMessage: 'resource not found',
                })
            }
        }
        res.statusCode = 500;
        return res.send({
            error: e,
        })
    }
    finally {
        if (conn) await conn.release();
    }
});

app.delete('/notes/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const [[note]] = await conn.query('SELECT * FROM tbl_notes WHERE pk_note = ?', [id]);
        console.log(note);
        if (!note) throw { domainError: 'note_not_found' };

        await conn.beginTransaction();
        await conn.query("DELETE FROM tbl_notes WHERE pk_note = ?", [id]);
        await conn.commit();
        res.statusCode = 200;
        return res.send(id);
    } catch (e) {
        if ('domainError' in e) {
            if (e.domainError === 'note_not_found') {
                res.statusCode = 404;
                return res.send({
                    statusMessage: 'resource not found to delete',
                })
            }
        }
        res.statusCode = 500;
        return res.send({
            error: e,
        })
    }
    finally {
        if (conn) await conn.release();
    }
});

app.listen(port);
console.log('app running in port ', port)