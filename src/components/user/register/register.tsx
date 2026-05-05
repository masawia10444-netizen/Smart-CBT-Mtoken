import { observer } from 'mobx-react-lite'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import { useRouter } from 'next/router'
import useRegister, { UseRegisterProps } from './useRegister'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import FormikTextField from '../../../controls/textField/formikTextField'
import { Formik, FormikProps, Form, Field, FieldProps } from 'formik'
import { useTranslation } from 'react-i18next'
import Button from '../../../controls/button/button'
import FormikCheckbox from '../../../controls/checkbox/formikCheckbox'
import * as Yup from 'yup'
import { checkboxRequired, password, validateEmail, validateRequired } from '../../../utilities/shareValidate'
import Link from '@material-ui/core/Link'

import Verify from './verify'
import Meta from '../../../controls/meta/meta'
import omitBy from 'lodash/omitBy'
import isUndefined from 'lodash/isUndefined'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { useTheme } from '@material-ui/core/styles'

const SignupSchema = Yup.object().shape({
    email: Yup.string().required('VALIDATE.REQUIRED'),
})

type ReturnTypeUseRegister = ReturnType<typeof useRegister>
type RegisterViewProps = ReturnTypeUseRegister & {}
let RegisterView: React.FC<RegisterViewProps> = observer(
    ({ handleSubmit: onSubmit, success, handleCheckboxChange }) => {
        const classes = useStyles()
        const { t } = useTranslation()
        const router = useRouter()
        const theme = useTheme()
        const isMobileView = useMediaQuery(theme.breakpoints.down('xs'))

        const handleClickCancel = () => {
            router.push('/')
        }

        const isMTokenFlow = router.query.mtoken_flow === '1'

        if (success) return <Verify />

        return (
            <Formik
                initialValues={{
                    email: (router.query.email as string === 'null' ? '' : router.query.email as string) || '',
                    firstName: (router.query.firstName as string === 'null' ? '' : router.query.firstName as string) || '',
                    lastName: (router.query.lastName as string === 'null' ? '' : router.query.lastName as string) || '',
                    password: '',
                    confirmPassword: '',
                    acceptTerms: false,
                }}
                enableReinitialize={true}
                onSubmit={onSubmit}
                validate={(values: any) => {
                    const errors: {
                        confirmPassword: string | undefined
                    } = { confirmPassword: undefined }

                    if (password(values.confirmPassword)) {
                        errors.confirmPassword = password(values.confirmPassword) as string
                    }

                    if (values.confirmPassword !== values.password) {
                        errors.confirmPassword = 'VALIDATE.PASSWORD_NOT_MATCH'
                    }

                    return omitBy(errors, isUndefined)
                }}
                validationSchema={SignupSchema}
            >
                {({ errors, touched, values, handleSubmit }: FormikProps<any>) => (
                    <Grid className={classes.container} container justify='center' alignItems='flex-start'>
                        <Meta
                            data={{
                                title: t('REGISTER.TITLE'),
                                description: t('REGISTER.TITLE'),
                                image: '',
                            }}
                        />
                        <Grid item xs={8} sm={6} md={4} lg={3} container justify='flex-start' alignItems='center'>
                            <Typography variant='h2' className={classes.title}>
                                {t('REGISTER.TITLE')}
                            </Typography>

                            <Grid item xs={12} className={classes.textField}>
                                <Field
                                    name='email'
                                    component={FormikTextField}
                                    variant='outlined'
                                    label={t('REGISTER.FORM.EMAIL')}
                                    type='email'
                                    validate={validateEmail}
                                    required
                                    clearable={!isMTokenFlow}
                                    disabled={isMTokenFlow}
                                />
                            </Grid>
 
                            <Grid item xs={12} className={classes.textField}>
                                <Field
                                    name='firstName'
                                    component={FormikTextField}
                                    variant='outlined'
                                    label={t('REGISTER.FORM.FIRST_NAME')}
                                    type='text'
                                    validate={validateRequired}
                                    required
                                    clearable={!isMTokenFlow}
                                    disabled={isMTokenFlow}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField}>
                                <Field
                                    name='lastName'
                                    component={FormikTextField}
                                    variant='outlined'
                                    label={t('REGISTER.FORM.LAST_NAME')}
                                    type='text'
                                    validate={validateRequired}
                                    required
                                    clearable={!isMTokenFlow}
                                    disabled={isMTokenFlow}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField}>
                                <Field
                                    name='password'
                                    component={FormikTextField}
                                    variant='outlined'
                                    label={t('REGISTER.FORM.PASSWORD')}
                                    type='password'
                                    validate={password}
                                    required
                                    clearable={true}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField}>
                                <Field
                                    name='confirmPassword'
                                    component={FormikTextField}
                                    variant='outlined'
                                    label={t('REGISTER.FORM.CONFIRM_PASSWORD')}
                                    type='password'
                                    required
                                    clearable={true}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField} style={{ zIndex: 0 }}>
                                {' '}
                                <Field
                                    name='acceptTerms'
                                    component={FormikCheckbox}
                                    label={
                                        <Typography variant='body1' noWrap={isMobileView ? false : true}>
                                            <span> {t('REGISTER.ACCEPT')}</span>{' '}
                                            <Link
                                                underline='always'
                                                color='secondary'
                                                href={process.env.NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL}
                                                style={{ pointerEvents: 'auto' }}
                                                target='_self'
                                            >
                                                {t('REGISTER.POLICY')}
                                            </Link>
                                        </Typography>
                                    }
                                    type='checkbox'
                                    color='secondary'
                                    validate={checkboxRequired}
                                    onCheckboxChange={handleCheckboxChange}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField}>
                                <Button
                                    label={t('HOME.LOGIN.REGISTER')}
                                    btnType='save'
                                    //@ts-ignore
                                    onClick={handleSubmit}
                                />
                            </Grid>

                            <Grid item xs={12} className={classes.textField}>
                                <Button
                                    label={t('HOME.CANCEL')}
                                    btnType='cancel'
                                    type='reset'
                                    onClick={handleClickCancel}
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            </Formik>
        )
    },
)

type RegisterProps = UseRegisterProps & Omit<RegisterViewProps, keyof ReturnTypeUseRegister>
let Register: React.FC<RegisterProps> = ({ ...others }) => {
    const register = useRegister({})
    return <RegisterView {...register} {...others} />
}

export default observer(Register)

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        container: {
            width: '100%',
            background: '#FFFFFF',
            paddingTop: '10%',
            paddingBottom: 100,
            [theme.breakpoints.up('sm')]: {
                paddingTop: 100,
            },
            [theme.breakpoints.up('md')]: {
                paddingTop: 120,
            },
            [theme.breakpoints.up('lg')]: {
                paddingTop: 140,
            },
        },
        title: {
            marginBottom: 30,
            fontSize: 24,
            [theme.breakpoints.up('sm')]: {
                fontSize: 28,
                marginBottom: 40,
            },
        },
        textField: {
            marginBottom: 50,
            height: 48,
        },
        dialogPaper: {
            borderRadius: 0,
            width: '90%',
            maxWidth: 'unset',
            [theme.breakpoints.up('md')]: {
                width: '60vw',
            },
        },
        okButton: {
            width: '90%',
            height: 34,
            marginBottom: 10,
            marginTop: 10,
            [theme.breakpoints.up('sm')]: {
                width: '55%',
            },
        },
    }),
)
