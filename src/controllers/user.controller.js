import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const existedUser = User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser) { // try to give error with specification of username or email
        throw new ApiError(409, "Username already exist")
    }

    // check for cover images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

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

export {registerUser}

