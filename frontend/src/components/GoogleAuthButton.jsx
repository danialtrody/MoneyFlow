import { GoogleLogin } from '@react-oauth/google'

export default function GoogleAuthButton({ onSuccess, onError, className = '' }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential)
          }
        }}
        onError={() => onError?.()}
        theme="filled_black"
        shape="rectangular"
        text="continue_with"
        size="large"
        width="400"
      />
    </div>
  )
}
