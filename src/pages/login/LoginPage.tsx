import {
  App,
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  Typography,
  theme,
} from "antd";
import { isAxiosError } from "axios";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

interface LoginFormValues {
  username: string;
  password: string;
}

function redirectPathFromLocation(location: ReturnType<typeof useLocation>): string {
  return (
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/"
  );
}

export default function LoginPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const finishLogin = () => {
    navigate(redirectPathFromLocation(location), { replace: true });
  };

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await login(values.username, values.password);
      finishLogin();
    } catch {
      setErrorMessage("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDemoSignIn = async () => {
    setDemoSubmitting(true);
    setErrorMessage(null);
    try {
      await demoLogin();
      finishLogin();
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        message.warning("Demo is not available");
        return;
      }
      if (status === 400) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Demo login does not accept credentials in the request body",
          ),
        );
        return;
      }
      if (status === 401) {
        setErrorMessage(
          getApiErrorMessage(error, "Demo sign-in failed. Please try again."),
        );
        return;
      }
      setErrorMessage("Could not sign in to the demo.");
    } finally {
      setDemoSubmitting(false);
    }
  };

  const busy = submitting || demoSubmitting;

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
              <Input autoComplete="username" disabled={busy} />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password autoComplete="current-password" disabled={busy} />
            </Form.Item>

            {errorMessage ? (
              <Typography.Text type="danger">{errorMessage}</Typography.Text>
            ) : null}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={submitting} disabled={demoSubmitting} block>
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: 0 }}>or</Divider>

          <Flex vertical gap={8}>
            <Button
              htmlType="button"
              block
              loading={demoSubmitting}
              disabled={submitting}
              onClick={() => void onDemoSignIn()}
            >
              Sign in as demo
            </Button>
            <Typography.Text type="secondary">
              Try the demo — shared sample candidate. Changes you make (status,
              cover letters) are visible to other visitors.
            </Typography.Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
