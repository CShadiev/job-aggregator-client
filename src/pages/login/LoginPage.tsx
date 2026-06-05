import { Button, Card, Flex, Form, Input, Typography, theme } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { token } = theme.useToken();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(values.username, values.password);
      const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? "/";
      navigate(redirectPath, { replace: true });
    } catch {
      setErrorMessage("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: "100vh", background: token.colorBgBase }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Flex vertical gap={16}>
          <div>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              Sign in
            </Typography.Title>
            <Typography.Text type="secondary">
              Access your personalised job feed and application tracker.
            </Typography.Text>
          </div>

          <Form layout="vertical" onFinish={(values) => void onFinish(values)}>
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>

            {errorMessage ? (
              <Typography.Text type="danger">{errorMessage}</Typography.Text>
            ) : null}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={submitting} block>
                Sign in
              </Button>
            </Form.Item>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}
