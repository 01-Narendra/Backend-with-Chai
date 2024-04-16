import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true

}))

app.use(express.json({ limit: "20kb" })) 
app.use(express.urlencoded( { extended: true, limit:'20kb' } ) )
app.use(express.static("public")) // this is used to store assests in public folder
app.use(cookieParser())

// router import
import  userRouter from './routes/user.routes.js'

//router decleration

app.use("/api/v1/users", userRouter)

// http://localhost:5000/api/v1/users/register








export {app}