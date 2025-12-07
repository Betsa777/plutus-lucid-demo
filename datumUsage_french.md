---

# 📌 Comprendre l’usage des datums avec Plutus et Lucid dans `DatRed`

Dans Cardano, **un datum n’est jamais passé directement au script**.
Il doit être **stocké dans un UTxO** et le script ne peut le lire que **lorsque ce UTxO est consommé**.

Le smart contract `DatRed` illustre parfaitement ce modèle.

---

## 1️⃣ Le smart contract `DatRed` (Plutus Haskell)

### Définition du datum et du redeemer

```haskell
data DemoDatum = DemoDatum{
    signer:: PubKeyHash,
    datumValue:: Integer
}

data DemoRedeemer = VerifySign | Compare Integer
```

* `DemoDatum` contient les données à stocker **on-chain**.
* `DemoRedeemer` contient les informations dynamiques envoyées lors de la consommation du UTxO.

### Validator

```haskell
validator :: DemoDatum -> DemoRedeemer -> ScriptContext -> Bool
validator datum redeemer ctx =
     case redeemer of
      VerifySign -> txSignedBy (scriptContextTxInfo ctx) (signer datum)
      Compare value -> value == (datumValue datum)
```

* Le script **lit le datum depuis le UTxO consommé**.
* `redeemer` contient la commande de l’utilisateur.
* **Important : le datum n’existe dans le script que lorsqu’un UTxO qui le contient est consommé**.

---

## 2️⃣ Création d’un UTxO contenant un datum (`createFirstUtxo.js`)

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

* Ici, `payToContract` **crée le premier UTxO** à l’adresse du script.
* Le datum est **stocké on-chain**, mais le script **n’est pas exécuté** à cette étape.

> 🔑 **Astuce** : le datum devient utilisable seulement lorsqu’on consomme ce UTxO.

---

## 3️⃣ Récupérer le bon UTxO (`goodScriptUtxo`)

Avant de consommer un UTxO pour exécuter le script, il faut **identifier celui qui contient le datum correspondant** :

```js
const scriptUtxos = await lucid.utxosAt(validatorAddress);

let goodScriptUtxo = scriptUtxos.find((utxo) => {
  if (utxo.datum !== undefined) {
    const datum = Data.from(utxo.datum);
    if (datum.fields && datum.fields.length === 2) {
      const pkh = datum.fields[0];
      if (pkh === signerPubKeyHash) return utxo; // correspond au wallet du signer
    }
  }
});

if (!goodScriptUtxo) {
  alert("You must create a UTXO first");
  return;
}
```

* `Data.from(utxo.datum)` décode le datum inline stocké dans le UTxO.
* `goodScriptUtxo` sera **consommé dans la transaction suivante** pour passer le datum au validator.

---

## 4️⃣ Vérification de la signature (`verifySign.js`)

```js
const demoDatum = new Constr(0, [signerPubKeyHash, datum.fields[1]]);
const demoRedeemer = new Constr(0, []); // VerifySign

const tx = await lucid
  .newTx()
  .collectFrom(signerUtxos)
  .collectFrom([goodScriptUtxo], Data.to(demoRedeemer)) // consommation du UTxO
  .payToContract(
    validatorAddress,
    { inline: Data.to(demoDatum) },
    { lovelace: 2_000_000n },
  )
  .attachSpendingValidator(validator)
  .addSignerKey(signerPubKeyHash)
  .complete();
```

* `collectFrom([goodScriptUtxo], Data.to(demoRedeemer))` **consomme le UTxO** contenant le datum.
* Ce datum devient **l’argument `datum` du validator**.

---

## 5️⃣ Comparaison de valeur (`compare.js`)

```js
const demoDatum = new Constr(0, [signerPubKeyHash, BigInt(datumValue)]);
const demoRedeemer = new Constr(1, [BigInt(redeemerValue)]); // Compare

const tx = await lucid
  .newTx()
  .collectFrom(signerUtxos)
  .collectFrom([goodScriptUtxo], Data.to(demoRedeemer)) // consommation du UTxO
  .payToContract(
    validatorAddress,
    { inline: Data.to(demoDatum) },
    { lovelace: 2_000_000n },
  )
  .attachSpendingValidator(validator)
  .addSignerKey(signerPubKeyHash)
  .complete();
```

* Même logique : **le datum est lu depuis le UTxO consommé**.
* `Compare` prend la valeur du redeemer et la compare au `datumValue` du datum.
* La transaction peut ensuite **recréer un nouveau UTxO** avec un nouveau datum si nécessaire.

---

## 6️⃣ Résumé visuel du flux

| Étape                      | Action                                                     |
| -------------------------- | ---------------------------------------------------------- |
| Créer un datum             | `payToContract` stocke le datum dans un UTxO               |
| Identifier le UTxO correct | `goodScriptUtxo = utxosAt(...).find(...)`                  |
| Lire/utiliser le datum     | `collectFrom([goodScriptUtxo], redeemer)` consomme le UTxO |
| Exécuter le validator      | `datum + redeemer + txInfo` disponibles dans le script     |
| Mettre à jour l’état       | Nouveau UTxO avec nouveau datum si nécessaire              |

---

## 7️⃣ Conclusion

* **Le datum est toujours stocké on-chain dans un UTxO avant d’être utilisé**.
* `goodScriptUtxo` est la clé pour que le script lise le datum correct.
* `redeemer` contient les instructions dynamiques de l’utilisateur.
* Ce modèle permet de gérer **l’état d’une application** en utilisant le flux eUTxO.

---

