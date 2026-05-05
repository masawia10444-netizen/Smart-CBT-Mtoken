import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Store from '../../../stores/rootStore'
import { encrypt } from '../../../utilities/registerUltility'
import { useRouter } from 'next/router'
import Router from 'next/router'
import { GoogleLoginResponse } from 'react-google-login'
import { useConfirmationDialog } from '../../../controls/dialog/confirmationDialog'
import { useTranslation } from 'react-i18next'
import useMediaQuery from '@material-ui/core/useMediaQuery'

type LoginFormType = {
    email: string
    password: string
    rememberMe: boolean
}

const useLogin = () => {
    const { UserStore, LayoutStore } = Store()
    const { t } = useTranslation()
    const router = useRouter()
    const mobileSize = useMediaQuery('(max-width:800px)')

    const { openDialogConfirmation } = useConfirmationDialog()

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | HTMLDivElement>(null)
    const [isError, setIsError] = useState(false)
    const [openDialog, setOpenDialog] = useState(false)

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClickDiv = (event: React.MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setIsError(false)
    }

    const handleSubmit = async (params: LoginFormType) => {
        const encryptedPassword = await encrypt(params.password)
        const loginData = await UserStore.login({ ...params, password: encryptedPassword }, params.rememberMe)

        if (loginData.statusCode === 1) {
            setIsError(false)
            if (!UserStore.userInfo.isAcceptPolicy || UserStore.userInfo.isAcceptPDPA === null) {
                await LayoutStore.setOpenPolicyDialog(true)
            } else if (UserStore.userInfo.isFirstLogin) {
                await LayoutStore.setDisplayInterestDialog(true)
            } else {
                Router.push('/profile')
            }
        } else if (loginData.statusCode === -2) {
            setIsError(false)
            openDialogConfirmation({
                title: t('PROFILE.USER_DISABLED_MAIN_TEXT'),
                message: t('PROFILE.USER_DISABLED_TEXT'),
                showButtonCancel: false,
            })
        } else if (loginData.statusCode === -3) {
            setIsError(false)
            openDialogConfirmation({
                title: t('PROFILE.USER_DISABLED_MAIN_TEXT'),
                message: t('PROFILE.USER_NOT_VERIFY_EMAIL'),
                showButtonCancel: false,
            })
        } else {
            setIsError(true)
        }
    }

    type loginFacebookType = {
        email: string
        name: string
        picture: string
        id: string
    }

    const handleLoginFacebook = async (params: loginFacebookType) => {
        try {
            let name = params.name.split(' ')

            await UserStore.register({
                email: params.email,
                firstName: name[0],
                lastName: name?.length > 1 ? name[1] : null,
                password: null,
                social: 'facebook',
                facebookID: params.id,
                facebookName: params.name,
            })

            const loginData = await UserStore.login({ facebookID: params.id }, true)

            if (loginData.statusCode === 1) {
                if (!UserStore.userInfo.isAcceptPolicy || UserStore.userInfo.isAcceptPDPA === null) {
                    await LayoutStore.setOpenPolicyDialog(true)
                } else if (UserStore.userInfo.isFirstLogin) {
                    await LayoutStore.setDisplayInterestDialog(true)
                } else {
                    Router.push('/profile')
                }
            } else if (loginData.statusCode === -2) {
                openDialogConfirmation({
                    title: t('PROFILE.USER_DISABLED_MAIN_TEXT'),
                    message: t('PROFILE.USER_DISABLED_TEXT'),
                    showButtonCancel: false,
                })
            }
        } catch (err) {
            console.log('err-login-facebook', err)
            openDialogConfirmation({
                title: t('PROFILE.ERROR_SYSTEM_MAIN_TEXT'),
                message: t('PROFILE.ERROR_LOGIN_FACEBOOK_TEXT'),
                showButtonCancel: false,
            })
        }
    }

    const handleLoginGmail = useCallback(async (response: GoogleLoginResponse) => {
        try {
            await UserStore.register({
                email: response.profileObj.email,
                firstName: response.profileObj.givenName,
                lastName: response.profileObj.familyName,
                password: null,
                social: 'google',
                googleID: response.profileObj.googleId,
                googleName: response.profileObj.name,
            })

            const loginData = await UserStore.login({ googleID: response.profileObj.googleId }, true)

            if (loginData.statusCode === 1) {
                if (!UserStore.userInfo.isAcceptPolicy || UserStore.userInfo.isAcceptPDPA === null) {
                    await LayoutStore.clearStatePolicyDialog()
                    await LayoutStore.setOpenPolicyDialog(true)
                } else if (UserStore.userInfo.isFirstLogin) {
                    await LayoutStore.setDisplayInterestDialog(true)
                } else {
                    Router.push('/profile')
                }
            } else if (loginData.statusCode === -2) {
                openDialogConfirmation({
                    title: t('PROFILE.USER_DISABLED_MAIN_TEXT'),
                    message: t('PROFILE.USER_DISABLED_TEXT'),
                    showButtonCancel: false,
                })
            }
        } catch (err) {
            console.log('err-login-google', err)
            openDialogConfirmation({
                title: t('PROFILE.ERROR_SYSTEM_MAIN_TEXT'),
                message: t('PROFILE.ERROR_LOGIN_GOOGLE_TEXT'),
                showButtonCancel: false,
            })
        }
    }, [])

    // Ref guard to strictly prevent double-processing in React concurrent mode
    const hasProcessedMToken = useRef(false)

    useEffect(() => {
        // Robust parameter detection
        let mToken = (router.query.mToken || router.query.mtoken) as string
        let appId = router.query.appId as string

        // Fallback for initial render
        if (typeof window !== 'undefined' && (!mToken || !appId)) {
            const urlParams = new URLSearchParams(window.location.search)
            mToken = mToken || urlParams.get('mToken') || urlParams.get('mtoken')
            appId = appId || urlParams.get('appId')
        }

        if (mToken && appId && !UserStore.userInfo.email) {
            const handleMTokenLogin = async () => {
                // Prevent duplicate processing in Concurrent Mode
                if (typeof window !== 'undefined') {
                    if ((window as any)._mtoken_processing === mToken) return
                    ;(window as any)._mtoken_processing = mToken
                }

                if (hasProcessedMToken.current) return
                hasProcessedMToken.current = true
                
                try {
                    // Force removal of mToken/appId from URL internally to prevent re-processing
                    if (typeof window !== 'undefined') {
                        const newUrl = window.location.pathname
                        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
                    }

                    const response = await fetch('/webapp/api/auth/mtoken', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mToken, appId })
                    })
                    const result = await response.json()

                    if (result.success) {
                        const profile = result.profile
                        const loginData = result.loginData

                        if (loginData?.statusCode === 1) {
                            await UserStore.applyLoginResult(loginData, true)

                            if (!UserStore.userInfo.isAcceptPolicy || UserStore.userInfo.isAcceptPDPA === null) {
                                await LayoutStore.setOpenPolicyDialog(true)
                            } else {
                                router.replace('/')
                            }
                        } else {
                            const legacyPassword = profile.email ? `MTOKEN_${profile.email}_CBT` : ''
                            const legacyEncryptedPassword = legacyPassword ? await encrypt(legacyPassword) : ''
                            const legacyLoginData = legacyEncryptedPassword
                                ? await UserStore.login(
                                      {
                                          email: profile.email,
                                          password: legacyEncryptedPassword,
                                      },
                                      true,
                                  )
                                : null

                            if (legacyLoginData?.statusCode === 1) {
                                if (!UserStore.userInfo.isAcceptPolicy || UserStore.userInfo.isAcceptPDPA === null) {
                                    await LayoutStore.setOpenPolicyDialog(true)
                                } else {
                                    router.replace('/')
                                }
                                return
                            }

                            router.replace({
                                pathname: '/register',
                                query: { 
                                    mtoken_flow: '1',
                                    email: profile.email,
                                    firstName: profile.firstName,
                                    lastName: profile.lastName,
                                }
                            })
                        }
                    } else {
                        // Suppress "redis data not found" alert as it's common if tokens are single-use or bridge is called twice
                        // Only show specific errors that the user needs to act on
                        if (!result.message.includes('redis data not found')) {
                            alert(`MToken Error: ${result.message}`)
                        }
                    }
                } catch (error) {
                    alert('MToken Error: การเชื่อมต่อล้มเหลว')
                }
            }
            handleMTokenLogin()
        }
    }, [router.query, router.asPath, UserStore.userInfo.email])

    const isLoginPage = typeof window !== 'undefined' && (window.location.pathname.endsWith('/login') || router.asPath.includes('/login'))
    useEffect(() => {
        if (UserStore.userInfo.email && isLoginPage) router.replace('/')
    }, [UserStore.userInfo.email, isLoginPage])

    return {
        anchorEl,
        setAnchorEl,
        handleClick,
        handleClose,
        handleSubmit,
        handleLoginFacebook,
        handleLoginGmail,
        isError,
        handleClickDiv,
        mobileSize,
        openDialog,
        setOpenDialog,
    }
}
export default useLogin
