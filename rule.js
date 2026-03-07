{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null ",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "families": {
      "$familyId": {
        ".read": "auth != null && root.child('users').child(auth.uid).child('familyId').val() == $familyId",
        ".write": "auth != null && (root.child('users').child(auth.uid).child('familyId').val() == $familyId || root.child('users').child(auth.uid).child('familyId').val() == null)"
      }
    },
    "members": {
  "$memberId": {
    ".read": "auth != null && root.child('users').child(auth.uid).child('familyId').val() != null",
    ".write": "auth != null && (
      root.child('users').child(auth.uid).child('familyId').val() == root.child('members').child($memberId).child('familyId').val()
      || !root.child('members').child($memberId).exists()
      || root.child('users').child(auth.uid).child('familyId').val() == null
    )"
  }
},
    "mobileIndex": {
      ".read": true,
      ".write": "auth != null"
    },
    "familiesByPin": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "usersByEmail": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "honoraryIndex": {
      ".read": true,
      ".write": "auth != null"
    },
     "connectors": {
      "$connKey": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || !data.child('joinedUserId').exists() || data.child('uploadedBy').child(auth.uid).exists())"
      }},
    "config": {
      ".read": "auth != null",
      ".write": false
    }
  }
}