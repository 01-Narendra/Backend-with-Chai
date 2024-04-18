import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefressToken = async(userId) => {
    try {
        const user = await User.findById(userId); 
        const accessToken  = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken // store refresh Token in db
        await user.save({ validateBeforeSave: false });

        return {accessToken, refreshToken}
    } 
    catch (error) {
        throw new ApiError(500,
        "something went wrong while generating access and refress token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from frontend
    const {fullName, username, email, password} = req.body
    console.log("Email: ", email);
    console.log("Password: ",password);

    // validation - not empty
    if (
        [username, fullName, email, password].some((field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    // check if user already exist: username, email
    const existedUser = await User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser) { // try to give error with specification of username or email
        throw new ApiError(409, "Username already exist")
    }

    // check for cover images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) &&
     req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar Image is required")
    }

    // upload them on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar Image is required")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refress token field from response 
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if(!userCreated) {
        throw new ApiError(500, "something wrong while registering user")
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, userCreated, "User Registered Successfully")
    )

})

const loginUser = asyncHandler( async(req,res) => {
    // req->body se data le aao
    // username or email
    // find the user
    // check the password
    // acessToken and refressToken
    // send cokies
    // return response

    const {username, email, password} = req.body

    if(!email || !username) {
        throw new ApiError(400, "email or username is rrquired")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user) {
        throw new ApiError(404, "User is not Registered yet !")
    }

    const  isPasswordMatch = await user.isPasswordCorrect(password)
    if(isPasswordMatch)

    if(!isPasswordMatch) {
        throw new ApiError(404, "Password is incorrect ")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefressToken(user._id)

    const loggedInUser = User.findById(uesr._id)
    .select("-password, -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logggin Successfully"
        )
    )

})

const logOutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"))

})

export {
    registerUser,
    loginUser,
    logOutUser
}

