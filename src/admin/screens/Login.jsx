import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'
import { backend } from '../backend/adapter.js'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import { Field } from '../ui/Field.jsx'

/**
 * The front door.
 *
 * The one screen in the dashboard that gets to look like the brand rather than
 * like a tool: a photo panel on the left, the form on the right. Everything
 * past this point is a work surface and stays restrained.
 *
 * Validation is deliberately late — nothing turns red while the client is still
 * typing their email. Fields validate on submit and then, once they've been
 * marked wrong, live-clear as they're corrected.
 */

export default function Login() {
  const { signIn, error, pending, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const emailError = touched && !email.trim() ? 'Enter the email you sign in with.' : ''
  const passwordError = touched && !password ? 'Enter your password.' : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!email.trim() || !password) return
    const ok = await signIn(email, password)
    if (!ok) {
      // Leave the password in place and select it. Clearing it fired the
      // field's own "Enter your password" error underneath a banner that had
      // just said the credentials were wrong — two messages contradicting each
      // other — and it forces a full retype over what is usually one typo.
      passwordRef.current?.focus()
      passwordRef.current?.select()
    }
  }

  return (
    <div className="login">
      <aside className="login__brand" aria-hidden="true">
        <img
          className="login__photo"
          src="/images/flavors/FlavorImages/chocolate.jpg"
          alt=""
          width="1050"
          height="1400"
        />
        <div className="login__brand-inner">
          <img
            className="login__logo"
            src="/images/Logos/Fab Fresh Color.png"
            alt=""
            width="72"
            height="72"
          />
          <p className="login__brand-line">
            The flavor case and the show schedule, in one place.
          </p>
        </div>
      </aside>

      <main className="login__panel">
        <div className="login__form-wrap">
          <img
            className="login__logo login__logo--mobile"
            src="/images/Logos/Fab Fresh Color.png"
            alt="Fab Fresh Fudge"
            width="56"
            height="56"
          />

          <h1 className="login__title">Sign in</h1>
          <p className="login__sub">Manage the flavors, shows and gift packages on fabfreshfudge.com.</p>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            {error ? (
              <div className="alert alert--error" role="alert">
                <Icon name="alert" size={17} />
                <span>{error}</span>
              </div>
            ) : null}

            <Field label="Email" htmlFor="login-email" required error={emailError}>
              <div className="input-wrap input-wrap--iconed">
                <Icon name="mail" size={17} className="input-wrap__icon" />
                <input
                  ref={emailRef}
                  id="login-email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@fabfreshfudge.com"
                  value={email}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'login-email-error' : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) clearError()
                  }}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="login-password" required error={passwordError}>
              <div className="input-wrap input-wrap--iconed">
                <Icon name="lock" size={17} className="input-wrap__icon" />
                <input
                  ref={passwordRef}
                  id="login-password"
                  className="input input--with-action"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) clearError()
                  }}
                />
                <button
                  type="button"
                  className="input-wrap__action"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" size="lg" full loading={pending}>
              {pending ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          {backend.isMock ? (
            <div className="login__demo">
              <p className="login__demo-title">
                <Icon name="alert" size={15} />
                Demo sign-in
              </p>
              <p className="login__demo-body">
                No backend is connected yet, so this checks one hard-coded account in the
                browser. It is not security.
              </p>
              <dl className="login__demo-creds">
                <div>
                  <dt>Email</dt>
                  <dd>owner@fabfreshfudge.com</dd>
                </div>
                <div>
                  <dt>Password</dt>
                  <dd>fudge2026</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <a className="login__back" href="/">
            <Icon name="external" size={15} />
            Back to the website
          </a>
        </div>
      </main>
    </div>
  )
}
