  import { useState } from 'react';
  import { Button } from './ui/button';
  import { GraduationCap } from 'lucide-react';
  import { UserRole } from '../App';


  type Name = string;
  type Username = string;
  interface LoginScreenProps {
    onLogin: (
      role: UserRole,
      userId: number,
      name: Name,
      username: Username,
      onboardingRequired: boolean
    ) => void;
    onGoRegister: () => void;
  }



  export default function LoginScreen({ onLogin, onGoRegister }: LoginScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        // Call parent with role and user_id
      onLogin(
        data.user_type,
        data.ta_id || data.professor_id || 0,
        data.name,
        data.username,
        data.onboarding_required
      );
      } catch (err: any) {
        setError(err.message);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-blue-900 text-xl mb-1">Comp Grad Toolbox</h1>
            <p className="text-neutral-600 text-sm">TA Assignment & Report Checker</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              className="w-full p-3 border rounded-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button onClick={handleSubmit} className="w-full h-12 mt-2">Login</Button>
            <Button
                variant="outline"
                onClick={onGoRegister}
                className="w-full h-12"
              >
                Register
            </Button>
          </div>
        </div>
      </div>
    );
  }
