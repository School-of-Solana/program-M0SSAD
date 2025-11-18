/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tip_jar.json`.
 */
export type TipJar = {
  "address": "75ozxYC9js6iFTQzwaz5SAKXGa9prCvyHqY1UZzDiDun",
  "metadata": {
    "name": "tipJar",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createCreatorProfile",
      "discriminator": [
        139,
        244,
        127,
        145,
        95,
        172,
        140,
        154
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "bio",
          "type": "string"
        }
      ]
    },
    {
      "name": "sendTip",
      "discriminator": [
        231,
        88,
        56,
        242,
        241,
        6,
        31,
        59
      ],
      "accounts": [
        {
          "name": "tipper",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "creator.authority",
                "account": "creator"
              }
            ]
          }
        },
        {
          "name": "tip",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "tipper"
              },
              {
                "kind": "account",
                "path": "creator.tip_count",
                "account": "creator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "message",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateProfile",
      "discriminator": [
        98,
        67,
        99,
        206,
        86,
        115,
        175,
        1
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "The creator who owns the profile (must sign to update)"
          ],
          "signer": true,
          "relations": [
            "creator"
          ]
        },
        {
          "name": "creator",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "bio",
          "type": "string"
        }
      ]
    },
    {
      "name": "withdrawTips",
      "discriminator": [
        107,
        192,
        228,
        68,
        165,
        120,
        164,
        23
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "creatorAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "withdrawalRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "creator_account.withdrawal_count",
                "account": "creator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "creator",
      "discriminator": [
        237,
        37,
        233,
        153,
        165,
        132,
        54,
        103
      ]
    },
    {
      "name": "tip",
      "discriminator": [
        87,
        218,
        38,
        122,
        15,
        197,
        190,
        230
      ]
    },
    {
      "name": "withdrawal",
      "discriminator": [
        10,
        45,
        211,
        182,
        129,
        235,
        90,
        82
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Creator name is too long (max 32 characters)"
    },
    {
      "code": 6001,
      "name": "bioTooLong",
      "msg": "Creator bio is too long (max 200 characters)"
    },
    {
      "code": 6002,
      "name": "messageTooLong",
      "msg": "Tip message is too long (max 140 characters)"
    },
    {
      "code": 6003,
      "name": "invalidTipAmount",
      "msg": "Tip amount must be greater than zero"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "Only the creator can perform this action"
    },
    {
      "code": 6005,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized access - only the creator can update this profile"
    },
    {
      "code": 6006,
      "name": "nameEmpty",
      "msg": "Creator name cannot be empty"
    },
    {
      "code": 6007,
      "name": "overflow",
      "msg": "Arithmetic overflow occurred"
    },
    {
      "code": 6008,
      "name": "insufficientTipsBalance",
      "msg": "Insufficient tips to perform this withdrawal"
    },
    {
      "code": 6009,
      "name": "invalidWithdrawalAmount",
      "msg": "Invalid Withdrawal Amount"
    }
  ],
  "types": [
    {
      "name": "creator",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "totalTips",
            "type": "u64"
          },
          {
            "name": "tipCount",
            "type": "u64"
          },
          {
            "name": "withdrawalCount",
            "type": "u64"
          },
          {
            "name": "tipsBalance",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "lastWithdrawal",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tip",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "tipper",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "withdrawal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
