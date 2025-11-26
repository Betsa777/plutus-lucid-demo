# Smart Contract Plutus : DemoDatum Validator

## Objectif général
Ce smart contract est un **validateur simple** qui permet de contrôler l'accès à des UTXO basés sur :

1. La **signature d'un utilisateur spécifique** (vérification de l'identité du signataire).
2. La **correspondance d'une valeur** entre le datum associé à l'UTXO et la valeur fournie dans le redeemer.

Il illustre deux types de validation classiques dans les contrats Plutus : la vérification de signature et la comparaison de valeurs.

---

## Structures de données

### DemoDatum
Le datum stocké avec l'UTXO contient deux informations :

- `signer :: PubKeyHash` : la clé publique de l'utilisateur autorisé à dépenser l'UTXO.
- `datumValue :: Integer` : une valeur entière associée à l'UTXO, utilisée pour les comparaisons.

### DemoRedeemer
Le redeemer fourni lors de la dépense de l'UTXO peut être de deux types :

- `VerifySign` : indique que la dépense doit être validée uniquement par la signature correcte.
- `Compare Integer` : indique que la dépense doit être validée si la valeur fournie correspond à celle du datum.

---

## Fonctionnement du validateur

### validator
Le cœur du smart contract est la fonction `validator` :

- Si le redeemer est `VerifySign` : la dépense ne sera autorisée que si la transaction est signée par la clé publique spécifiée dans le datum.
- Si le redeemer est `Compare value` : la dépense ne sera autorisée que si `value == datumValue`.

### untypedValidator
Cette fonction convertit les données de type `BuiltinData` vers les types Haskell définis (`DemoDatum` et `DemoRedeemer`) et appelle le `validator`.  
Elle est nécessaire pour la compilation en script Plutus exécutable.

---

## Compilation et export
- `validatorScript` compile le validateur en un script Plutus exécutable.
- `getCbor` permet d'écrire le script dans un fichier `.plutus` pour l'utiliser sur la blockchain Cardano.

---

## Cas d'utilisation
- Restreindre l'accès à un UTXO à une seule clé publique (authentification simple).
- Valider des transactions basées sur une valeur numérique spécifique.
- Servir d'exemple pour la création de smart contracts Plutus manipulant **datum** et **redeemer**.

# DApp Demo : Interaction avec le smart contract `DemoDatum`

Cette DApp web permet d'interagir avec le smart contract Plutus `DemoDatum` décrit précédemment.  
Elle fournit trois fonctionnalités principales à l'utilisateur via trois boutons : **CreateUtxo**, **Compare**, et **Sign**.

---

## Fonctionnalités et workflow

### 1. CreateUtxo
- **Bouton :** `CreateUtxo`
- **Fichier JS associé :** `createFirstUtxo.js`
- **Objectif :**
  1. L'utilisateur qui se connecte crée un **UTxO initial** à l'adresse du smart contract.
  2. Le `PubKeyHash` de l'utilisateur est enregistré dans le `DemoDatum` associé à cet UTxO.
  3. Une **valeur numérique** est également stockée dans le datum (`datumValue`), qui servira plus tard à la vérification.
- **Rôle dans le workflow :**
  - Permet de vérifier plus tard l'identité de l'utilisateur via `VerifySign`.
  - Sert de point de départ pour les tests de comparaison et de signature.

### 2. Compare
- **Bouton :** `Compare`
- **Fichier JS associé :** `compare.js`
- **Objectif :**
  - L'utilisateur fournit une valeur via le champ `redeemer`.
  - Le smart contract vérifie si cette valeur correspond à celle stockée dans le datum (`datumValue`).
- **Rôle dans le workflow :**
  - Permet de tester la fonction `Compare` du smart contract.
  - Assure que la valeur que l'utilisateur passe correspond bien à celle qu'il a initialement stockée.

### 3. Sign
- **Bouton :** `Sign`
- **Fichier JS associé :** `verifySig.js`
- **Objectif :**
  - Vérifie que la transaction est **signée par le `PubKeyHash` correspondant** à celui enregistré dans le datum.
  - Permet de valider l'identité de l'utilisateur qui dépense l'UTxO.
- **Rôle dans le workflow :**
  - Teste la fonctionnalité `VerifySign` du smart contract.
  - Garantit que seul le créateur de l'UTxO peut effectuer certaines opérations sur celui-ci.

---

## Champs de saisie
- **first** : UTxO initial à utiliser pour les tests.
- **redeemer** : Valeur à envoyer au smart contract pour les comparaisons ou signatures.
- **datum** : Nouvelle valeur à stocker sur le smart contract, si nécessaire pour la mise à jour.

---

## Résumé du flux utilisateur
1. L'utilisateur se connecte et crée un UTxO avec son `PubKeyHash` et une valeur numérique (via `CreateUtxo`).
2. L'utilisateur peut ensuite tester :
   - la correspondance de valeur (`Compare`)
   - ou la vérification de signature (`Sign`)
3. Chaque opération est validée par le smart contract `DemoDatum`, garantissant sécurité et intégrité.

---

> Cette DApp sert d'exemple pédagogique pour comprendre :
> - le stockage de datum dans un UTxO,
> - la vérification de signature via `PubKeyHash`,
> - et la comparaison de données on-chain via des redeemers.
