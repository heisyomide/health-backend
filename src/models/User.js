const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assuming you're using bcryptjs

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Do not return password by default
    },
    role: {
        type: String,
        enum: ['patient', 'practitioner', 'admin'],
        default: 'patient'
    },
    // Reference to the specific profile
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        // The 'ref' will be determined dynamically or on creation based on the role
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);