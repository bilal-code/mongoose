import mongoose from "mongoose";
import newUser from "./NewUser.js";
import {
    createThirdwebClient,
    getContract,
    prepareEvent,
    getContractEvents,
  } from "thirdweb";
import express, { json } from "express";
import cors from "cors";
import { defineChain } from "thirdweb/chains";
import "dotenv/config";
import blockNumber from "./BlockFetcher.js"


// *** State values ***
    // server 
    const app = express();
    app.use(cors());
    app.use(express.json());
    const router = express.Router();
    var fromBlock = 26562743n;


// *** contract ***
    const client = createThirdwebClient({
        clientId: process.env.CLIENT_ID,
    });
    const myContract = getContract({
        client,
        chain: defineChain(4002),
        address: process.env.CONTRACT_ADDRESS
    });
    const preparedEvent = prepareEvent({
    myContract,
    signature:
        "event NewUser(uint _user, uint _sponcer, uint256 amount, uint256 time)",
    });

    const events = await getContractEvents({
    contract: myContract,
    fromBlock: fromBlock,
    toBlock: blockNumber,
    events: [preparedEvent],
    });


// mongoose
    const clientOptions = { 
        serverApi: { 
            version: '1', 
            strict: true, 
            deprecationErrors: true 
        } 
    };

const FetchInfo = async () => {
    let value1 =[];
    let value2 =[];
    let value3 =[];
    let value4 =[];
    // try {
        const run = async ()=>{
            for (let i = 0; i < events.length; i++) {
                // fetch events 
                value1.push( JSON.stringify(events[i].args._user, (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
                ))
                value2.push(JSON.stringify(events[i].args._sponcer,
                    (key, value) => (typeof value === "bigint" ? value.toString() : value)
                ))
                
                value3.push(JSON.stringify(events[i].args.amount, (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
                ))
                
                value4.push(JSON.stringify(events[i].args.time, (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
                ))
            }
            let CurrentBlockNumber ;
            const options = {
                method: 'GET',
                headers: {
                  accept: 'application/json',
                  'X-API-Key': process.env.API_BLOCK_FETCHER
                }
              };
            
            await fetch('https://svc.blockdaemon.com/universal/v1/fantom/testnet/sync/block_number', options)
            .then(response => CurrentBlockNumber = response.json()
            )
            .then(response => (
                CurrentBlockNumber = BigInt(Number.response),
                console.log(fromBlock, CurrentBlockNumber)
            )).catch(err => console.error(err));
            fromBlock = CurrentBlockNumber;
        }
        const run2 = async ()=>{                
                for (let i = 0; i < (events.length + 1); i++) {
                    if(i < (events.length )){                   
                    // Create a new user and save to the database
                        const user = new newUser({
                            user: value1[i],
                            sponcerId: value2[i],
                            amount: value3[i],
                            time: value4[i]
                        });
                        await user.save().then(()=>{
                            console.log(`New user: ${value1[i]} => Sponcer: ${value2[i]} =  saved ✅ `);
                        })     
                        value1.splice(i, -1);
                        value2.splice(i, -1);
                        value3.splice(i, -1);
                        value4.splice(i, -1);
                        // events.splice(i, -1);  
                    }else if(events.length == i ){
                        while (events.length > 0) {
                            events.pop();
                            value1.pop();
                            value2.pop();
                            value3.pop();
                            value4.pop();
                        }
                    }
                }
        }
        await run();
        await mongoose.connect(
            process.env.URL,
            clientOptions);

        console.log("Connected to MongoDB");  
        await run2();
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
};

/// Run every 2 seconds

// app.listen(3001, () => {
//     console.log(`Server is running on port 3001`),
//     setInterval(FetchInfo, 4000)
// });


const userRoutes = router.get("/", async (req, res) => {
    try {
        await mongoose.connect(
            process.env.URL,
            clientOptions);

        console.log("Connected to MongoDB");
        const users = await newUser.find();
        res.json(users);
        res.send(users);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  });

app.use("/newusers", userRoutes);
app.listen(3001, () => console.log(`Server started on port 3001`) );
