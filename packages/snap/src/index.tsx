import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
// import { Box, Text, Bold } from '@metamask/snaps-sdk/jsx';
import { encrypt, decrypt } from '@requestnetwork/utils';
import { EncryptionTypes, IdentityTypes } from '@requestnetwork/types';

import { getBIP44AddressKeyDeriver } from "@metamask/key-tree"


async function get100Identities(deriveDogecoinAddress: any) {
  const addressKeys = [];

  for (let i = 0; i < 100; i++) {
    const addressKey = await deriveDogecoinAddress(i);

    if (addressKey.privateKey === undefined) {
      throw Error(`Derived key not found for index ${i}`);
    }

    addressKeys.push(addressKey.address);
  }

  return addressKeys;
}


/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {

  // ####################################################################################################
  // ####################################################################################################
  // ####################################################################################################
  const dogecoinNode = await snap.request({
    method: "snap_getBip44Entropy",
    params: {
      coinType: 1,
    },
  })
  // Next, create an address key deriver function for the Dogecoin coin_type node.
  // In this case, its path is: m/44'/3'/0'/0/address_index
  const deriveDogecoinAddress = await getBIP44AddressKeyDeriver(dogecoinNode)
  // ####################################################################################################
  // ####################################################################################################
  // ####################################################################################################

  switch (request.method) {
    case 'decrypt':
      if(!request.params) {
        throw Error('request.params not provided');
      }
  
      // ####################################################################################################
      // This example uses Dogecoin, which has coin_type 3.

      // These are BIP-44 nodes containing the extended private keys for the respective derivation paths.
      // m/44'/3'/0'/0/0
      const addressKey0 = await deriveDogecoinAddress(0)
      
      if(addressKey0.privateKey === undefined) {
        throw Error('Derived key not found');
      }

      const hardcodedIdentity = {
        decryptionParams: {
          key: addressKey0.privateKey,
          method: EncryptionTypes.METHOD.ECIES,
        },
        encryptionParams: {
          key: addressKey0.publicKey,
          method: EncryptionTypes.METHOD.ECIES,
        },
        identity: {
          type: IdentityTypes.TYPE.ETHEREUM_ADDRESS,
          value: addressKey0.address, // '0xb3de30b4be816dd066b1c5c5c8aed340b88a18a1',
        },
      };
      // ####################################################################################################

      if(!request.params.encryptedData || !request.params.encryptedData.value || !request.params.encryptedData.type) {
        throw Error('encryptedData must be provided')
      }

      if(!request.params.identity || !request.params.identity.value || !request.params.identity.type) {
        throw Error('identity must be provided')
      }

      const encryptedData = request.params.encryptedData;
      const identity = request.params.identity;


      // TODO: GET DECRYPTION KEY FROM IDENTITY
      if(hardcodedIdentity.identity.value != identity.value) {
        throw Error(`identity unknown`);
      }
      if(hardcodedIdentity.identity.type != identity.type) {
        throw Error('identity type not supported');
      }

      try {
        // const encryptedData = await encrypt(data, otherIdRaw.encryptionParams);
        const decryptedData = await decrypt(encryptedData, hardcodedIdentity.decryptionParams)

        return decryptedData;
      } catch(e) {

        const encryptedData = await encrypt("Alea Jacta Es.", hardcodedIdentity.encryptionParams);
        throw Error(`${e} - ${encryptedData.value}`);
      }


    case 'list':
      return await get100Identities(deriveDogecoinAddress);

    case 'isRegistered':
      if(!request.params) {
        throw Error('request.params not provided');
      }

      const identitiesRegistered = await get100Identities(deriveDogecoinAddress);

      if (!request.params.identity || !request.params.identity.value || !request.params.identity.type) {
        throw new Error('identity must be provided');
      }
      
      const found = identitiesRegistered.some((address:any) => 
        address === request.params.identity.value
        // identity.value === request.params.identity.value && 
        // identity.type === request.params.identity.type
      );
      return found;
      
    // case 'hello':
    //   return snap.request({
    //     method: 'snap_dialog',
    //     params: {
    //       type: 'confirmation',
    //       content: (
    //         <Box>
    //           <Text>
    //             Hello, <Bold>{origin}</Bold>!
    //           </Text>
    //           <Text>
    //             This custom confirmation is just for display purposes.
    //           </Text>
    //           <Text>
    //             But you can edit the snap source code to make it do something,
    //             if you want to!
    //           </Text>
    //         </Box>
    //       ),
    //     },
    //   });
    default:
      throw new Error('Method not found.');
  }
};
