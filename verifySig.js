import { lucid, validator, validatorAddress, connectWallet } from "./common.js";
import {
  Lucid,
  Blockfrost,
  Data,
  fromText,
  Constr,
} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";

const signButton = document.getElementById("signBtn");
signButton.addEventListener("click", async function () {
  const signerAddress = await connectWallet();

  console.log({ signerAddress });
  const signerPubKeyHash =
    lucid.utils.getAddressDetails(signerAddress).paymentCredential.hash;
  const signerUtxos = await lucid.wallet.getUtxos();
  const scriptUxtos = await lucid.utxosAt(validatorAddress);
  console.log({ scriptUxtos });
  console.log({ signerPubKeyHash });
  const goodScriptUtxo = scriptUxtos.find((utxo) => {
    if (utxo.datum !== undefined) {
      // console.log("utxo is", utxo);
      const datum = Data.from(utxo.datum);
      if (datum.fields && datum.fields.length == 2) {
        const pkh = datum.fields[0];
        // console.log("datum de 0", datum.fields[0]);
        if (pkh == signerPubKeyHash) return utxo;
        else {
          alert("create a Utxo first");
          return;
        }
      }
    }
  });
  console.log("decoded datum is", goodScriptUtxo);
  const datum = Data.from(goodScriptUtxo.datum);

  // Verify if pubkeyHash in the datum matches the signer pubkeyHash
  // datum.fields[1] corresponds to the previous datum stored by the signer
  const demoDatum = new Constr(0, [signerPubKeyHash, datum.fields[1]]);
  console.log(demoDatum);
  const demoRedeemer = new Constr(0, []);
  const tx = await lucid
    .newTx()
    .collectFrom(signerUtxos)
    .collectFrom([goodScriptUtxo], Data.to(demoRedeemer))
    .payToContract(
      validatorAddress,
      { inline: Data.to(demoDatum) },
      { lovelace: 2_000_000n },
    )
    .attachSpendingValidator(validator)
    .addSignerKey(signerPubKeyHash)
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
