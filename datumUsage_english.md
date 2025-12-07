---

# 📌 Understanding the Use of Datums with Plutus and Lucid in `DatRed`

On Cardano, **a datum is never passed directly to the script**.
It must be **stored in a UTxO**, and the script can only read it **when that UTxO is consumed**.

The `DatRed` smart contract perfectly illustrates this model.
<a href="https://github.com/Betsa777/plutus-lucid-demo/blob/main/DatRed.hs">DatRed.hs</a>

---

## 1️⃣ The `DatRed` Smart Contract (Plutus Haskell)

### Datum and Redeemer Definition

```haskell
data DemoDatum = DemoDatum{
    signer:: PubKeyHash,
    datumValue:: Integer
}

data DemoRedeemer = VerifySign | Compare Integer
```

* `DemoDatum` contains the data to be stored **on-chain**.
* `DemoRedeemer` contains the dynamic information sent when consuming the UTxO.

### Validator

```haskell
validator :: DemoDatum -> DemoRedeemer -> ScriptContext -> Bool
validator datum redeemer ctx =
     case redeemer of
      VerifySign -> txSignedBy (scriptContextTxInfo ctx) (signer datum)
      Compare value -> value == (datumValue datum)
```

* The script **reads the datum from the consumed UTxO**.
* `redeemer` contains the user's command.
* **Important: the datum exists in the script only when a UTxO containing it is consumed**.

---

## 2️⃣ Creating a UTxO with a Datum (`createFirstUtxo.js`)

```js
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
```

* Here, `payToContract` **creates a UTxO** at the script address.
* The datum is **stored on-chain**, but the script **is not executed** at this step.

> 🔑 **Tip:** The datum becomes usable only when consuming this UTxO.

---

## 3️⃣ Retrieving the Correct UTxO (`goodScriptUtxo`)

Before consuming a UTxO to execute the script, you must **identify the one containing the corresponding datum**:

```js
const scriptUtxos = await lucid.utxosAt(validatorAddress);

let goodScriptUtxo = scriptUtxos.find((utxo) => {
  if (utxo.datum !== undefined) {
    const datum = Data.from(utxo.datum);
    if (datum.fields && datum.fields.length === 2) {
      const pkh = datum.fields[0];
      if (pkh === signerPubKeyHash) return utxo; // matches the signer's wallet
    }
  }
});

if (!goodScriptUtxo) {
  alert("You must create a UTXO first");
  return;
}
```

* `Data.from(utxo.datum)` decodes the inline datum stored in the UTxO.
* `goodScriptUtxo` will be **consumed in the next transaction** to pass the datum to the validator.

---

## 4️⃣ Verifying the Signature (`verifySign.js`)

```js
const demoDatum = new Constr(0, [signerPubKeyHash, datum.fields[1]]);
const demoRedeemer = new Constr(0, []); // VerifySign

const tx = await lucid
  .newTx()
  .collectFrom(signerUtxos)
  .collectFrom([goodScriptUtxo], Data.to(demoRedeemer)) // consume the UTxO
  .payToContract(
    validatorAddress,
    { inline: Data.to(demoDatum) },
    { lovelace: 2_000_000n },
  )
  .attachSpendingValidator(validator)
  .addSignerKey(signerPubKeyHash)
  .complete();
```

* `collectFrom([goodScriptUtxo], Data.to(demoRedeemer))` **consumes the UTxO** containing the datum.
* This datum becomes **the `datum` argument in the validator**.

---

## 5️⃣ Comparing Values (`compare.js`)

```js
const demoDatum = new Constr(0, [signerPubKeyHash, BigInt(datumValue)]);
const demoRedeemer = new Constr(1, [BigInt(redeemerValue)]); // Compare

const tx = await lucid
  .newTx()
  .collectFrom(signerUtxos)
  .collectFrom([goodScriptUtxo], Data.to(demoRedeemer)) // consume the UTxO
  .payToContract(
    validatorAddress,
    { inline: Data.to(demoDatum) },
    { lovelace: 2_000_000n },
  )
  .attachSpendingValidator(validator)
  .addSignerKey(signerPubKeyHash)
  .complete();
```

* Same logic: **the datum is read from the consumed UTxO**.
* `Compare` takes the redeemer value and compares it with the `datumValue` of the datum.
* The transaction can then **recreate a new UTxO** with a new datum that is passes as `demoDatum`.

---

## 6️⃣ Visual Summary of the Flow

| Step                      | Action                                                      |
| ------------------------- | ----------------------------------------------------------- |
| Create a datum            | `payToContract` stores the datum in a UTxO                  |
| Identify the correct UTxO | `goodScriptUtxo = utxosAt(...).find(...)`                   |
| Read/use the datum        | `collectFrom([goodScriptUtxo], redeemer)` consumes the UTxO |
|                           |  that contains the good datum
| Execute the validator     | `datum + redeemer + txInfo` available in the script         |
| Update state              | New UTxO with new datum if needed                           |

---

## 7️⃣ Conclusion

* **The datum is always stored on-chain in a UTxO before it can be used.**
* `goodScriptUtxo` is key for the script to read the correct datum.
* `redeemer` contains the user's dynamic instructions.
* This model allows **managing the application state** using the eUTxO flow.

---
