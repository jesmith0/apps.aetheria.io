import * as Web3 from "web3";
import * as util from 'ethereumjs-util';
import {password, delegationABI, landABI, delegAddr, landAddr} from './DelegationABI';

class PlacementTxBuilder {
    web3: any;
    landInstance: any;
    delegInstance: any;
    y: any;
    x: any;

    constructor()
    {
        //@ts-ignore
        this.web3 = new Web3("http://localhost:8545")
        this.landInstance = new this.web3.eth.Contract(landABI, landAddr);
        this.delegInstance = new this.web3.eth.Contract(delegationABI, delegAddr);
    }

    fromRpcSig(sig: string) {
        const buf: Buffer = util.toBuffer(sig)
          
        // NOTE: with potential introduction of chainId this might need to be updated
        if (buf.length !== 65) {
            throw new Error('Invalid signature length')
        }
          
        let v = buf[64];
        
        //removed 27 check should fix the signature check
        
        return {
            v: v,
            r: buf.slice(0, 32),
            s: buf.slice(32, 64),
        }
    }

    async buildTx(plotArray: any, addr: string)
    {
        let nonce = await this.delegInstance.methods.currentNonce.call()
        let cords = plotArray.map((x:any)=>x.cords)
        let landIds= await this.getLandIds(cords)
        let landHexs = landIds.map((x:any)=>x._hex)
        let addresses =  await this.web3.eth.getAccounts()
        let address = addresses[0];
        let packed = this.web3.eth.abi.encodeParameters(["address", "uint256[]", "uint256"], [addr, landHexs, nonce]);
        let packedHashedData = this.web3.utils.keccak256(packed);
        let sig = await this.web3.eth.personal.sign(packedHashedData, address, password);
        let signatureParams = this.fromRpcSig(sig);
        
        return {
            v: signatureParams.v,
            r: signatureParams.r,
            s: signatureParams.s,
            nonce: nonce,
            addr: addr,
            plotIds: landHexs
        }

    }

    async getLandIds(cords:any): Promise<any[]>
    {
        return new Promise(async (res, rej) => {
            let landIdsPromises = cords.map((cords:any)=>this.landInstance.methods.encodeTokenId(cords.x, cords.y).call())
            Promise.all(landIdsPromises).then((landIds) => {
                res(landIds);
            })
        })
    }
}

export {PlacementTxBuilder}
