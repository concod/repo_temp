import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import BannerAssetsChatPage from "./pages/BannerAssetsChatPage";
// @ts-expect-error Reuse existing JSX component in TSX routes.
import AssetsPage from "./pages/Assets/AssetsPage";
import AssetEditorPage from "./pages/AssetEditor/AssetEditorPageRefactored";
// @ts-expect-error Reuse existing JSX component in TSX routes.
import ProjectsPage from "./pages/Projects/ProjectsPage";
import AdvancedEditorPage from "./pages/AdvancedEditor/AdvancedEditorPageRefactored";
import TemplateEditorPage from "./pages/TemplateEditor/TemplateEditorPage";
import BrandingPage from "./pages/BrandingPage";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { useAuthStore } from "./store/authStore";

export const BannerAgentRoutes = () => {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    const handleLoginSuccess = () => {
        navigate("../home", { replace: true, relative: "path" });
    };

    const handleNavigateToSignUp = () => {
        navigate("../signup", { replace: true, relative: "path" });
    };

    const handleNavigateToLogin = () => {
        navigate("../login", { replace: true, relative: "path" });
    };

    const handleSignUpSuccess = () => {
        navigate("../login", { replace: true, relative: "path" });
    };

    return (
        <Routes>
            <Route
                index
                element={
                    isAuthenticated ? (
                        <Navigate to="home" replace />
                    ) : (
                        <Navigate to="login" replace />
                    )
                }
            />
            <Route
                path="login"
                element={
                    isAuthenticated ? (
                        <Navigate to="../home" replace relative="path" />
                    ) : (
                        <LoginPage
                            onLoginSuccess={handleLoginSuccess}
                            onNavigateToSignUp={handleNavigateToSignUp}
                        />
                    )
                }
            />
            <Route
                path="signup"
                element={
                    isAuthenticated ? (
                        <Navigate to="../home" replace relative="path" />
                    ) : (
                        <SignUpPage
                            onSignUpSuccess={handleSignUpSuccess}
                            onBackToLogin={handleNavigateToLogin}
                        />
                    )
                }
            />
            <Route
                path="assets"
                element={
                    <ProtectedRoute>
                        <AssetsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="projects"
                element={
                    <ProtectedRoute>
                        <ProjectsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="home"
                element={
                    <ProtectedRoute>
                        <BannerAssetsChatPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="asset-editor"
                element={
                    <ProtectedRoute>
                        <AssetEditorPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="assets-editor"
                element={
                    <ProtectedRoute>
                        <AssetEditorPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="advanced-editor"
                element={
                    <ProtectedRoute>
                        <AdvancedEditorPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="branding"
                element={
                    <ProtectedRoute>
                        <BrandingPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="template-editor"
                element={
                    <ProtectedRoute>
                        <TemplateEditorPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
    );
};
