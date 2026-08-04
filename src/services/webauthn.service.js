import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import prisma from '../config/prisma.js';
import { rpName, rpID, origin } from '../config/webauthn.js';

// In-memory challenge store (usar Redis en producción)
const challengeStore = new Map();

function storeChallenge(key, challenge) {
    challengeStore.set(key, { challenge, expiresAt: Date.now() + 5 * 60_000 });
}

function consumeChallenge(key) {
    const entry = challengeStore.get(key);
    challengeStore.delete(key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.challenge;
}

export async function buildRegistrationOptions(user) {
    const existingPasskeys = await prisma.passkey.findMany({ where: { userId: user.id } });

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: isoUint8Array.fromUTF8String(user.id),
        userName: user.email,
        attestationType: 'none',
        excludeCredentials: existingPasskeys.map((pk) => ({
            id: pk.credentialId,
            transports: pk.transports,
        })),
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });

    storeChallenge(`reg:${user.id}`, options.challenge);
    return options;
}

export async function verifyAndSaveRegistration(user, response, friendlyName) {
    const expectedChallenge = consumeChallenge(`reg:${user.id}`);
    if (!expectedChallenge) throw new Error('CHALLENGE_EXPIRED');

    const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
        throw new Error('REGISTRATION_NOT_VERIFIED');
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

    await prisma.passkey.create({
        data: {
            userId: user.id,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey),
            counter: credential.counter,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            transports: credential.transports ?? [],
            friendlyName: friendlyName ?? 'Dispositivo biométrico',
        },
    });

    return true;
}

/**
 * Estado de la huella biométrica del usuario, para que el perfil sepa si debe
 * ofrecer "Registrar" o "Eliminar" sin tener que provocar un 400.
 */
export async function getPasskeyStatus(userId) {
    const passkey = await prisma.passkey.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { friendlyName: true, deviceType: true, createdAt: true, lastUsedAt: true },
    });

    return {
        registered: !!passkey,
        friendlyName: passkey?.friendlyName ?? null,
        deviceType: passkey?.deviceType ?? null,
        createdAt: passkey?.createdAt ?? null,
        lastUsedAt: passkey?.lastUsedAt ?? null,
    };
}

/**
 * Elimina la(s) passkey(s) del usuario. Con la regla de "una por usuario" borra
 * como mucho una, pero se usa deleteMany para no fallar si quedara alguna huérfana
 * y para poder volver a registrar desde cero. Devuelve cuántas se eliminaron.
 */
export async function deletePasskeys(userId) {
    const { count } = await prisma.passkey.deleteMany({ where: { userId } });
    return count;
}

export async function buildAuthenticationOptions(email) {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { passkeys: true },
    });

    if (!user || user.passkeys.length === 0) throw new Error('NO_PASSKEYS_REGISTERED');

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials: user.passkeys.map((pk) => ({
            id: pk.credentialId,
            transports: pk.transports,
        })),
    });

    storeChallenge(`auth:${email}`, options.challenge);
    return { options, userId: user.id };
}

export async function verifyAuthenticationAndGetUser(email, response) {
    const expectedChallenge = consumeChallenge(`auth:${email}`);
    if (!expectedChallenge) throw new Error('CHALLENGE_EXPIRED');

    const passkey = await prisma.passkey.findUnique({
        where: { credentialId: response.id },
        include: {
            user: {
                include: { role: true },
            },
        },
    });

    if (!passkey) throw new Error('PASSKEY_NOT_FOUND');

    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
            id: passkey.credentialId,
            publicKey: passkey.publicKey,
            counter: Number(passkey.counter),
            transports: passkey.transports,
        },
    });

    if (!verification.verified) throw new Error('AUTHENTICATION_NOT_VERIFIED');

    await prisma.passkey.update({
        where: { id: passkey.id },
        data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
    });

    return passkey.user;
}