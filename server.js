const express = require("express");
const app = express();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
app.use(cookieParser());
app.use(bodyParser.json());
const url = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.9.1";
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.static('html/'))
const userschema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    date: String,
    address: String,
    form: Number,
    district: String,
    state: String,
    pincode: Number,
    age: Number,
    gender: String,
    phno: Number
});

const otpschema = new mongoose.Schema({
    email: String,
    otp: Number,
    expiry: Date
});
otpschema.index({ expiry: 1 }, { expireAfterSeconds: 300 });
const customerschema = new mongoose.Schema({
    quantity: Number,
    time: String,
    completed: Number,
    title: String,
    date: String,
    email: String,
    district: String,
    id: String
});
const usermodel = mongoose.model('users', userschema);
const otpmodel = mongoose.model('otps', otpschema);
const cmodel = mongoose.model('orders', customerschema);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bodduamarnath2023@gmail.com',
        pass: 'zkolppmibcfnuzbs'
    }
});
app.get('/', (req, res) => {
    var email = req.cookies.sid;
    if (email) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(__dirname + '/html/CSPWeb.html');
    }
});

app.get('/dashboard', async (req, res) => {
    var email = req.cookies.sid;
    if (email) {
        const user1 = await usermodel.findOne({ email });
        if (user1 && user1.form == 0) {
            res.redirect('/form');
        } else {
            res.sendFile(__dirname + '/html/ProfHome.html');
        }
    } else {
        res.redirect('/');
    }
});


app.get("/login/:email/:password", async (req, res) => {
    const email = req.params.email;
    const password = req.params.password;
    try {
        const user = await usermodel.findOne({ email, password });
        if (user) {
            const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
            res.cookie('sid', email, { maxAge: oneWeekInMilliseconds });
            return res.json({ success: true, message: "Login successful", user });
        } else {
            const user1 = await usermodel.findOne({ email });
            if (user1) {
                return res.status(401).json({ success: false, message: "password incorrect" });
            }
            else {
                return res.status(401).json({ success: false, message: "not registered" });
            }
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get('/otp/:email', async (req, res) => {
    const generatedOTP = Math.floor(1000 + Math.random() * 9000);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);
    const email = req.params.email;
    const OTPModel = mongoose.model('OTP', otpschema);
    const exist = await usermodel.findOne({ email })
    if (exist) {
        return res.status(400).json({ success: false, message: 'already user exists' });
    }
    const newOTP = new OTPModel({
        email: email,
        otp: generatedOTP,
        expiry: otpExpiry,
    });
    var mailOptions = {
        from: 'bodduamarnath2023@gmail.com',
        to: email,
        subject: 'otp for verfication',
        text: 'The otp for password request is:' + String(generatedOTP)
    };
    transporter.sendMail(mailOptions)
        .then(response => {

        })
        .catch(error => {

        });
    newOTP.save()
        .then(savedOTP => {
            res.json({ success: true });
        })
        .catch(error => {
            console.error('Error saving OTP:', error);
            res.status(500).json({ success: false, message: 'Failed to generate OTP.' });
        });
});

app.get('/verify/:email/:otp/:password', async (req, res) => {
    const email = req.params.email;
    const otp = req.params.otp;
    const password = req.params.password;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }
    try {
        const existingOTP = await otpmodel.findOne({ email, otp });
        if (!existingOTP) {
            return res.status(400).json({ success: false, message: 'Invalid OTP or OTP expired.' });
        }
        const newUser = new usermodel({
            email,
            date: new Date(),
            password: password,
            form: 0
        });
        await newUser.save();
        res.cookie('sid', email, { httpOnly: true });

        return res.status(200).json({ success: true, message: 'User registered successfully.' });
    } catch (error) {
        console.error('Error validating OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to validate OTP.' });
    }
});
app.get('/form', async (req, res) => {
    res.sendFile(__dirname + '/html/PersonInfo.html')
})
app.get('/save/:data', async (req, res) => {
    const email = req.cookies.sid;
    const data = JSON.parse(decodeURIComponent(req.params.data));

    try {
        const result = await usermodel.updateOne({ email }, { $set: data });

        if (result.matchedCount > 0) {
            return res.status(200).json({ success: true, message: 'User information updated successfully.' });
        } else {
            return res.status(200).json({ success: false, message: 'No user information updated.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});
app.get('/savec/:quantity/:time/:title', async (req, res) => {
    var quantity = req.params.quantity;
    var time = req.params.time;
    var title = req.params.title;
    var email = req.cookies.sid;
    try {
        const users = await usermodel.find({ email });

        if (users.length === 0) {

            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = users[0];

        const newUser = new cmodel({
            quantity,
            date: new Date(),
            time,
            title,
            email: email,
            district: user.district,
            completed: 0,
            id: user.district + user.phno + user.state+title+quantity+new Date()
        });

        await newUser.save();
        return res.status(200).json({ success: true, message: 'User registered successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});
app.get('/c', async (req, res) => {
    var email = req.cookies.sid;
    var user = await usermodel.find({ email });
    var orders = await cmodel.find({ district: user[0].district, completed: 0 })
    if (orders) {
        return res.status(200).json({ success: true, message: 'User registered successfully.', orders });
    }
    return res.status(200).json({ success: false, message: 'User registered successfully.' });

});
app.get('/y', async (req, res) => {
    var email = req.cookies.sid;
    const user = await usermodel.findOne({ email });
    const orders = await cmodel.find({ email, completed: 0 })
    if (orders) {
        if (orders) {
            return res.status(200).json({ success: true, message: 'User registered successfully.', orders });
        }
        return res.status(200).json({ success: false, message: 'User registered successfully.' });
    }
});
app.get('/logout', async (req, res) => {
    res.clearCookie('sid');
    res.redirect('/');
});
app.get('/fetch', async (req, res) => {
    var email = req.cookies.sid;
    const user = await usermodel.findOne({ email });
    if (user) {
        return res.status(200).json({ success: true, message: 'Internal server error.', user });
    }
    return res.status(200).json({ success: false, message: 'Internal server error.' });
});
app.get('/r/:id', async (req, res) => {
    try {
        var id = req.params.id;
        const result = await cmodel.updateOne({ id }, { $set: { completed: 1 } });
        if (result.modifiedCount > 0) {
            return res.status(200).json({ success: true, message: 'Record updated successfully.' });
        } else {
            return res.status(200).json({ success: false, message: 'No records matched the provided ID.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

app.get('/yu/:id', async (req, res) => {
    var id = req.params.id;
    var user1 = await cmodel.findOne({ id })
    var user = await usermodel.findOne({ email: user1.email })
    if (user) {
        var z=user1.quantity;
        return res.status(200).json({ success: true, message: 'Internal server error.', user,z });
    }
    else {
        return res.status(200).json({ success: false, message: 'Internal server error.' });
    }
})
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
