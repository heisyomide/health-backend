const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    role: {
        type: String,
        enum: ['patient', 'practitioner', 'admin'],
        default: 'patient'
    },
    // --- NEW STATUS FIELDS ---
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending' 
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // -------------------------
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'roleModel' // Dynamic reference
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);