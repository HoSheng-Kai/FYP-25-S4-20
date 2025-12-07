import { Keypair } from "@solana/web3.js";
import crypto from "crypto";

async function generate_keys(
    username: string, 
    password: string, 
    email: string
): Promise<{publicKey: string, privateKey: string}> {
    let seed_string = `${username}-${password}-${email}`;
    let seed = crypto.createHash('sha256').update(seed_string).digest();
    let keypair = Keypair.fromSeed(seed);
    
    return {
        publicKey: keypair.publicKey.toString(),
        privateKey: JSON.stringify(Array.from(keypair.secretKey)),
    };
}

export {generate_keys};