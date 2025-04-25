const express = require('express');
const app = express();
const mongoose = require ('mongoose');
const port = process.env.PORT || 3000;
require('dotenv').config();
/*
Mongoose models provide static helper functions for CRUD operations.
Each of these functions returns a mongoose Query object.
Model.deleteMany()
Model.deleteOne()
Model.find()
Model.findById()
Model.findByIdAndDelete()
Model.findByIdAndRemove()
Model.findByIdAndUpdate()
Model.findOne()
Model.findOneAndDelete()
Model.findOneAndReplace()
Model.findOneAndUpdate()
Model.replaceOne()
Model.updateMany()
Model.updateOne()
*/
const uri = process.env.MONGODB_URI; // db connection string

//establish connection to our mongodb cluster
mongoose.connect(uri)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Failed to connect to MongoDB", err));


app.use(express.json());
app.use(express.static('public'));
const nodemailer = require('nodemailer');

// Nodemailer transport is the transport configuration object, connection url or a transport plugin instance
// transporter is going to be an object that is able to send mail
// https://www.nodemailer.com/message/
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS
    }
});

function sendEmail(toEmail, confirmation) {
    const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: toEmail,
        subject: 'Gofer Confirmation Code',
        text: `Thanks for using Gofer!\nIf you need to cancel or update your Gofer, you can go to MyGofers and enter your confirmation code to view, edit, or cancel the Gofer before it is accepted.\n\nYour Confirmation Code: ${confirmation}`
    };

    transporter.sendMail(mailOptions, (error, info) => { 
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

// A schema defines the structure of a document in your MongoDB collection
// we have a collection of pending orders. We want to add documents to that collection.
// Document and Model are distinct classes in Mongoose. The Model class is a subclass of the Document class.
// When you use the Model constructor, you create a new document.
// https://mongoosejs.com/docs/documents.html

const pendingOrderSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    address : { type: String, required: true },
    city: { type: String, required: true },
    state : { type: String , required: true },
    zip: { type: Number, required: true },
    email : { type: String, required: true },
    description : { type: String, required: true },
    time : { type: Date, required: true },
    item : { type: String, required: false },
    itemQuantity : { type: String, required: false },
    itemLocation : { type: String, required: false },
    confirmationID : { type: String, required: true },
});

const pendingOrder = mongoose.model('pendingGofers', pendingOrderSchema);

app.post('/create-Gofer', async (req, res) => {
    confirmationid = confirmation(); // create the code
    try {
        const newGofer = new pendingOrder({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.zip,
            email: req.body.email,
            description: req.body.description,
            time: req.body.time,
            item: req.body.item,
            itemQuantity: req.body.quantity,
            itemLocation: req.body.where,
            confirmationID: confirmationid,
        });
        await newGofer.save();
        res.json({ message: 'Gofer Created successfully!' });
        // with email and confirmation code we can now send email
        sendEmail(req.body.email, confirmationid);
    } catch (error) {
        res.status(500).json({ error: 'Failed to Create Gofer: ' + error });
    }
});

function confirmation() {
    // not perfect but extremely unlikey that two people get the same order confirmation
    // it will work for this type of low time project but not in a real business
    letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    const randomLetter1 = letters[Math.floor(Math.random() * 26)];
    const randomLetter2 = letters[Math.floor(Math.random() * 26)];
    const randomNumber1 = Math.floor(Math.random() * 10);
    const randomNumber2 = Math.floor(Math.random() * 10);

    return randomLetter1 + randomLetter2 + randomNumber1 + randomNumber2;
    // returns a random sequence of Letter, Letter, Number, Number
}

// https://www.zipcodeapi.com/API api used for finding the locality of our drivers to the pending Gofers
const zipCodeApiKey = process.env.ZIPCODE_API_KEY;

app.get("/retrieve-Gofer", async (req, res) =>{
    const zip = req.query.zip;
    const radius = req.query.distance;

    //https://www.zipcodeapi.com/rest/<api_key>/radius.<format>/<zip_code>/<distance>/<units>
    try {
        const apiURL = `https://www.zipcodeapi.com/rest/${zipCodeApiKey}/radius.json/${zip}/${radius}/miles?minimal`;// ?minimal will return only zip codes
        const response = await fetch(apiURL);
        const zipCodes = await response.json();
        // script js sends a request with a query of zip and distance. we can create a response back to script.js of our pendingOrder documents that contain the zip codes in our radius.
        // this api documentation was basically non-existent. i had to use postman to figure out what the response was.
    const orders = await pendingOrder.find({ zip: { $in: zipCodes.zip_codes } }); //zip_codes is the document name in the api response
    res.json(orders);
    }
    catch(e){
        console.error(e);
    }
});

app.get("/my-Gofers" , async (req, res) => {
    try{
        console.log('Confirmation Code:', req.query.code);
        const response = await pendingOrder.find({ confirmationID: req.query.code });
        res.json(response);
    }
    catch (e){
        console.log(e);
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

