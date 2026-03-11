const express = require("express")
const path = require("path")
const analyzeRoute = require("./routes/analyze")

const app = express()

app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.use("/analyze", analyzeRoute)

app.listen(3000, () => {
    console.log("Server running on port 3000")
})