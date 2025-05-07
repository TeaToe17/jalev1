"use client";

import Form from "../../../components/Form";

const Login: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f4f1ed', // Light beige background
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff', // Pure white background for form container
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px', // Max width for the form container
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            color: '#000000', // Black for the heading text
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}
        >
          Login
        </h1>
        <Form
          route="/api/token/"
          method="login"
        />
      </div>
    </div>
  );
};

export default Login;
