const { generateToken } = require('../config/jwtToken');
const User = require('../models/userModel');
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require('../utils/validateMongodbId');
const { generateRefreshToken } = require('../config/refreshtoken');
const jwt = require('jsonwebtoken');


const createUser = asyncHandler(async (req, res) => {
    const email = req.body.email;
    const findUser = await User.findOne({ email: email });
    if (!findUser) {
        //Create a new User
        const newUser = await User.create(req.body);
        res.json(newUser);
    }
    else {
        throw new Error('User Already Exists')
    }
});

//Login a User
const loginUserCtrl = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    //check if user exists or not 
    const findUser = await User.findOne({ email });
    if (findUser && (await findUser.isPasswordMatched(password))) {
        const refreshToken = await generateToken(findUser?._id);
        const updateuser = await User.findByIdAndUpdate(
            findUser._id,
            {
                refreshToken: refreshToken,
            },
            { new: true });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 72 * 60 * 60 * 1000,
        });
        res.json({
            _id: findUser?._id,
            firstname: findUser?.firstname,
            lastname: findUser?.lastname,
            email: findUser?.email,
            mobile: findUser?.mobile,
            token: generateToken(findUser._id),
        });
    } else {
        throw new Error("Invalid Credentials");
    }
});

//handle refresh token
const handleRefreshToken = asyncHandler(async (req, res) => {
    const cookie = req.cookies;
    console.log(cookie);
    if (!cookie?.refreshToken) throw new Error('No Refresh Token in Cookies');
    const refreshToken = cookie.refreshToken;
    const user = await User.findOne({ refreshToken });
    if (!user) throw new Error("No Refresh token present in db or not matched")
    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err || user.id !== decoded.id) {
            throw new Error("There is something wrong with refresh token");
        }
        const accessToken = generateToken(user._id);
        res.json({ accessToken })
    });
});

//logout functionality

const logout = asyncHandler(async (req, res) => {
    const cookie = req.cookies;
    if (!cookie?.refreshToken) throw new Error('No Refresh Token in Cookies');
    const refreshToken = cookie.refreshToken;
    const user = await User.findOne({ refreshToken });
    if (!user) {
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
        });
        return res.sendStatus(204); //forbidden
    }
    await User.findOneAndUpdate(refreshToken, {
        refreshToken: "",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
    });
    res.sendStatus(204); //forbidden
});

//Update a User
const updatedUser = asyncHandler(async (req, res) => {
    console.log();
    const { _id } = req.user;
    validateMongoDbId(_id);
    try {
        const updateaUser = await User.findByIdAndUpdate(
            _id, {
            firstname: req?.body?.firstname,
            lastname: req?.body?.lastname,
            email: req?.body?.email,
            mobile: req?.body?.mobile,
        }, {
            new: true
        }
        );
        res.json(updatedUser);
    } catch (error) {
        throw new Error(error);
    }
})


//Get all Users

const getallUser = asyncHandler(async (req, res) => {
    try {
        const getUsers = await User.find();
        res.json(getUsers);
    } catch (error) {
        throw new Error(error);
    }
});


//Get a single user

const getaUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const getaUser = await User.findById(id);
        res.json({
            getaUser
        });

    } catch (error) {
        throw new Error(error);
    }
});

//Delete a single user

const deleteaUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const deleteaUser = await User.findByIdAndDelete(id);
        res.json({
            deleteaUser
        });

    } catch (error) {
        throw new Error(error);
    }
});

const blockUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const block = await User.findByIdAndUpdate(
            id,
            {
                isBlocked: true
            },
            {
                new: true,
            }
        );
        res.json({
            message: "User Blocked"
        });
    } catch (error) {
        throw new Error(error)
    }
});
const unblockUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const unblock = await User.findByIdAndUpdate(
            id,
            {
                isBlocked: false
            },
            {
                new: true,
            }
        );
        res.json({
            message: "User UnBlocked"
        });
    } catch (error) {
        throw new Error(error)
    }
})

module.exports = { createUser, loginUserCtrl, getallUser, getaUser, deleteaUser, updatedUser, blockUser, unblockUser, handleRefreshToken, logout };