import { password } from './../utilities/shareValidate'
import { observable, action, runInAction } from 'mobx'
import { fetchGetWithAuthorization, fetchPostWithAuthorization, fetchPost } from '../utilities/request'
import { apiConfig } from '../configs/webAPIConfig'
import { encrypt } from '../utilities/registerUltility'

export type RegisterType = {
    email: string
    firstName: string
    lastName: string
    password: string | null
    social?: string | 'google' | 'facebook'
    facebookID?: string
    facebookName?: string
    googleID?: string
    googleName?: string
    isAcceptPDPA?: boolean
    isAcceptPDPA2?: boolean
}
export type LoginType = {
    email?: string
    password?: string
    facebookID?: string
    googleID?: string
}

export type UserInfoType = {
    email: string
    firstName: string
    lastName: string
    myTrip: MyTrip[]
    tel?: string
    userID: number
    isAcceptPolicy?: boolean
    isFirstLogin?: boolean
    profileImage: string | null
    profileImageUrl: string | null
    listInterestMenuID: {
        menuID: number | string
        badge: number | boolean
        path?: string
    }[]
    accessToken?: string
    refreshToken?: string
    status?: number
    statusCode?: number
    isAcceptPDPA?: boolean
    isAcceptPDPA2?: boolean
}

type MyTrip = {
    tripID: number
    tripName: string
    estmExpense: number
    day: number
}

export type LoginResponseType = {
    data: UserInfoType
    statusCode?: number
    message?: string
}
export type VerifyEmailType = {
    email: string
}
export type getProfileType = {
    email?: string
    userID?: number
}

export type UpdateProfileType = {
    firstName: string
    lastName: string
    tel: string
    listInterestMenuID: string
    profileImage: string | null
}

export type ResetPasswordPropsType = {
    userID: number
    token: string
    password: string
}

export type TInsertInterestResponse = {
    statusCode: number
    message: string
}

export type TUpdateUserStatus = {
    statusCode: number
    message: string
}

class userStore {
    _initUserInfo: UserInfoType = {
        email: '',
        firstName: '',
        lastName: '',
        tel: null,
        myTrip: [],
        userID: 0,
        isAcceptPolicy: null,
        isAcceptPDPA: null,
        listInterestMenuID: [],
        profileImage: null,
        profileImageUrl: null,
    }
    _rememberMe = false

    @observable registerInfo: any = undefined
    @observable userInfo: UserInfoType = this._initUserInfo

    @action register = async (params: RegisterType) => {
        const result: any = await fetchPost({ url: apiConfig.user.authentication.register, data: params })

        return result
    }

    @action verifyEmail = async (params: VerifyEmailType) => {
        const result: any = await fetchPost({ url: apiConfig.user.authentication.verifyEmail, data: params })
        return result
    }

    @action login = async (params: LoginType, rememberMe: boolean) => {
        const result: LoginResponseType = await fetchPost({ url: apiConfig.user.authentication.login, data: params })

        this.applyLoginResult(result, rememberMe)

        return result
    }

    @action applyLoginResult = (result: LoginResponseType, rememberMe: boolean) => {
        if (result.statusCode === 1) {
            this.setUserInfo(result.data)

            const encryptedData = encrypt(JSON.stringify(result.data))
            const encryptedAccessToken = encrypt(JSON.stringify(result.data.accessToken))
            const encryptedRefreshToken = encrypt(JSON.stringify(result.data.refreshToken))

            if (rememberMe) {
                localStorage.setItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_USER_INFO, encryptedData)
                localStorage.setItem(process.env.NEXT_PUBLIC_ACCESS_TOKEN, encryptedAccessToken)
                localStorage.setItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN, encryptedRefreshToken)
                this._rememberMe = true
            }

            if (result.data.isAcceptPolicy) {
                sessionStorage.setItem(process.env.NEXT_PUBLIC_ACCEPT_POLICY, 'true')
            }

            sessionStorage.setItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_USER_INFO, encryptedData)
            sessionStorage.setItem(process.env.NEXT_PUBLIC_ACCESS_TOKEN, encryptedAccessToken)
            sessionStorage.setItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN, encryptedRefreshToken)
        }
    }

    @action getProfile = async (params: getProfileType) => {
        if (!params.email) return
        const result: UserInfoType = await fetchPostWithAuthorization({
            url: apiConfig.user.authentication.getProfile,
            data: params,
        })
        this.setUserInfo(result)

        runInAction(() => {
            this.userInfo = result
        })

        if (this._rememberMe) {
            let encryptedData = await encrypt(JSON.stringify(result))
            await localStorage.setItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_USER_INFO, encryptedData)
        }
        if (result.isAcceptPolicy) {
            await sessionStorage.setItem(process.env.NEXT_PUBLIC_ACCEPT_POLICY, 'true')
        }

        return result
    }

    @action updateProfile = async (params: UpdateProfileType) => {
        await Object.assign(params, {
            userID: this.userInfo.userID,
        })

        const result: any = await fetchPostWithAuthorization({
            url: apiConfig.user.authentication.updateProfile,
            data: params,
        })

        return result
    }

    @action logout = () => {
        this.setUserInfo(this._initUserInfo)

        localStorage.removeItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_USER_INFO)
        localStorage.removeItem(process.env.NEXT_PUBLIC_ACCESS_TOKEN)
        localStorage.removeItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN)

        sessionStorage.removeItem(process.env.NEXT_PUBLIC_LOCAL_STORAGE_USER_INFO)
        sessionStorage.removeItem(process.env.NEXT_PUBLIC_ACCESS_TOKEN)
        sessionStorage.removeItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN)
        // sessionStorage.removeItem(process.env.NEXT_PUBLIC_ACCEPT_POLICY)
    }

    @action setUserInfo = (params: UserInfoType) => {
        this.userInfo = params
    }

    @action sendEmailForgotPassword = async (params: { email: string }) => {
        const result: any = await fetchPost({ url: apiConfig.user.authentication.forgotPassword, data: params })
        return result
    }

    @action checkTokenResetPassword = async (params: { userID: number; token: string }) => {
        const result: any = await fetchPost({
            url: apiConfig.user.authentication.checkTokenResetPassword,
            data: params,
        })
        return result
    }

    @action resetPassword = async (params: ResetPasswordPropsType) => {
        const result: any = await fetchPost({ url: apiConfig.user.authentication.resetPassword, data: params })
        return result
    }

    @action acceptPolicy = async (params: { userID: number }) => {
        const result: any = await fetchPost({ url: apiConfig.user.authentication.acceptPolicy, data: params })
        return result
    }

    @action insertLogLogin = async () => {
        const result: any = await fetchPostWithAuthorization({ url: apiConfig.log.login })
        return result
    }
}

export default userStore
