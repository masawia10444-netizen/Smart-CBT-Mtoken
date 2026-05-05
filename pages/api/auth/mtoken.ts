import type { NextApiRequest, NextApiResponse } from 'next'

export type MTokenProfile = {
    firstName?: string;
    lastName?: string;
    dateOfBirthString?: string;
    mobile?: string;
    email?: string;
    notification?: boolean;
};

type MTokenMatchField = "email" | "mobile" | "fullName";

type MTokenLookupMatch = {
    field: MTokenMatchField;
    value?: string;
    firstName?: string;
    lastName?: string;
};

// Helper to get environment variables safely
function getEnv(name: string) {
    return process.env[name] || '';
}

function normalizeText(value?: string) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeMobile(value?: string) {
    return normalizeText(value).replace(/[^\d+]/g, "");
}

function getMatchCandidates(profile: MTokenProfile): MTokenLookupMatch[] {
    const email = normalizeText(profile.email).toLowerCase();
    const mobile = normalizeMobile(profile.mobile);
    const firstName = normalizeText(profile.firstName);
    const lastName = normalizeText(profile.lastName);

    return [
        email && { field: "email" as const, value: email },
        mobile && { field: "mobile" as const, value: mobile },
        firstName && lastName && { field: "fullName" as const, firstName, lastName },
    ].filter(Boolean) as MTokenLookupMatch[];
}

function isLoginResponse(payload: any) {
    return payload?.statusCode === 1 && payload?.data?.accessToken && payload?.data?.refreshToken;
}

async function lookupMTokenUser(profile: MTokenProfile) {
    const lookupUrl = getEnv("MTOKEN_USER_LOOKUP_API_URL");
    const candidates = getMatchCandidates(profile);

    if (!lookupUrl || candidates.length === 0) {
        return {
            attempted: false,
            matched: false,
            match: null,
            loginData: null,
        };
    }

    for (const candidate of candidates) {
        const response = await fetch(lookupUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                matchField: candidate.field,
                matchValue: candidate.value,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                profile,
            }),
        });

        const raw = await response.text();
        let payload: any = null;
        try {
            payload = JSON.parse(raw);
        } catch { }

        const loginData = payload?.loginData || payload;
        if (response.ok && isLoginResponse(loginData)) {
            return {
                attempted: true,
                matched: true,
                match: candidate,
                loginData,
            };
        }
    }

    return {
        attempted: true,
        matched: false,
        match: null,
        loginData: null,
    };
}

async function fetchMTokenAuthToken() {
    const authUrl = getEnv("GDX_AUTH_URL");
    const secret = getEnv("CONSUMER_SECRET");
    const agentId = getEnv("AGENT_ID");
    const key = getEnv("CONSUMER_KEY");

    const url = new URL(authUrl);
    url.searchParams.set("ConsumerSecret", secret);
    url.searchParams.set("AgentID", agentId);

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Consumer-Key": key,
            "Content-Type": "application/json",
        }
    });

    const raw = await response.text();
    let payload: any = null;
    try {
        payload = JSON.parse(raw);
    } catch { }

    if (!response.ok || !payload?.Result) {
        throw new Error(payload?.message || `mToken authentication failed (${response.status})`);
    }

    return String(payload.Result);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { appId, mToken } = req.body;

    if (!appId || !mToken) {
        return res.status(400).json({ message: 'Missing appId or mToken' });
    }

    try {
        let profile: MTokenProfile;

        // [Smart Mock Interceptor] for local testing
        // Normalize mToken (handle URL encoding like smart-mock%3A)
        const normalizedMToken = decodeURIComponent(mToken);
        const mockPrefix = "smart-mock:";
        
        if (normalizedMToken.startsWith(mockPrefix)) {
            const base64Payload = normalizedMToken.replace(mockPrefix, "");
            const decodedString = Buffer.from(base64Payload, "base64").toString("utf-8");
            
            let mockResult: any;
            try {
                mockResult = JSON.parse(decodedString);
            } catch (err: any) {
                throw new Error(`Invalid Mock JSON: ${err.message}`);
            }
            
            profile = {
                firstName: mockResult.firstName || mockResult.FirstName || 'ชาวบ้าน',
                lastName: mockResult.lastName || mockResult.LastName || 'ใจดี',
                dateOfBirthString: mockResult.dateOfBirthString || mockResult.DateOfBirthString,
                mobile: mockResult.mobile || mockResult.Mobile || mockResult.telephone || mockResult.phoneNumber,
                email: mockResult.email || mockResult.Email,
                notification: mockResult.notification !== undefined ? mockResult.notification : true,
            };
        } else {
            // Real MToken Flow
            const gdxToken = await fetchMTokenAuthToken();
            
            const body = { AppId: appId, MToken: mToken };

            const profileResponse = await fetch(getEnv("PROFILE_ACCESS_API_URL"), {
                method: "POST",
                headers: {
                    "Consumer-Key": getEnv("CONSUMER_KEY"),
                    "Content-Type": "application/json",
                    "Token": gdxToken,
                },
                body: JSON.stringify(body)
            });

            const raw = await profileResponse.text();
            let payload: any = null;
            try {
                payload = JSON.parse(raw);
            } catch { }

            if (!profileResponse.ok || payload?.messageCode !== 200 || !payload?.result) {
                console.error("[MToken Bridge] GDX API Error:", JSON.stringify(payload));
                return res.status(401).json({ 
                    message: payload?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้จาก mToken ได้ หรือ mToken หมดอายุแล้ว' 
                });
            }

            const result = payload.result;
            console.log("[MToken Bridge] Profile retrieved successfully");

            profile = {
                firstName: result.firstName || result.FirstName || result.first_name || result.Firstname,
                lastName: result.lastName || result.LastName || result.last_name || result.Lastname,
                dateOfBirthString: result.dateOfBirthString || result.DateOfBirthString || result.birthday || result.BirthDate,
                mobile: result.mobile || result.Mobile || result.telephone || result.phoneNumber || result.phone_number || result.MobileNo,
                email: result.email || result.Email || result.email_address || result.EmailAddress || result.Mail,
                notification: result.notification !== undefined ? result.notification : (result.Notification !== undefined ? result.Notification : true)
            };
        }

        const lookupResult = await lookupMTokenUser(profile);

        return res.status(200).json({ 
            success: true, 
            profile,
            lookup: {
                attempted: lookupResult.attempted,
                matched: lookupResult.matched,
                match: lookupResult.match,
            },
            loginData: lookupResult.loginData,
        });

    } catch (error: any) {
        console.error("MToken API Bridge Error:", error);
        return res.status(500).json({ 
            message: error.message || 'Internal Server Error' 
        });
    }
}
