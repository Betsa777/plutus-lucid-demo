import { connectWallet, lucid, validatorAddress } from "./common.js";
import {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  fromText,
} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";

const createUtxoButton = document.getElementById("createUtxoBtn");

createUtxoButton.addEventListener("click", async function () {
  const userAddress = await connectWallet();
  const userUtxos = await lucid.wallet.getUtxos();
  const signerPubKeyHash =
    lucid.utils.getAddressDetails(userAddress).paymentCredential.hash;
  const firstUtxoDatumValue = BigInt(document.getElementById("first").value);
  const demoDatum = new Constr(0, [signerPubKeyHash, firstUtxoDatumValue]);

  const tx = await lucid
    .newTx()
    .collectFrom(userUtxos)
    .payToContract(
      validatorAddress,
      { inline: Data.to(demoDatum) },
      { lovelace: 2_000_000n },
    )
    .complete();
  try {
    const signedTx = await tx.sign().complete();
    const txhash = await signedTx.submit();
    console.log("Tx hash is ", txhash);
    document.getElementById("hash").innerHTML =
      `<a href="https://preprod.cardanoscan.io/transaction/${txhash}"
            target="_blank"
            style="color:#7c3aed; text-decoration:underline;">
            Transaction on preprod
         </a>`;
  } catch (err) {
    console.log(err);
  }
});
