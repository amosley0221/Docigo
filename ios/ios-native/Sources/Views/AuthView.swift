import SwiftUI

struct AuthView: View {
    @EnvironmentObject var auth: AuthStore

    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var password = ""
    @State private var busy = false
    @State private var errorMessage: String? = nil
    @State private var info: String? = nil

    enum Mode { case signIn, signUp }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: 18) {
                Text("Docigo")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                Text(mode == .signIn ? "Welcome back" : "Create your account")
                    .font(.system(size: 22, weight: .bold, design: .default))
                    .foregroundStyle(.white)

                if mode == .signUp {
                    HStack(spacing: 10) {
                        Field(label: "First name", text: $firstName, contentType: .givenName)
                        Field(label: "Last name", text: $lastName, contentType: .familyName)
                    }
                }
                Field(label: "Email", text: $email, contentType: .emailAddress, keyboard: .emailAddress)
                SecureField("", text: $password)
                    .textContentType(mode == .signIn ? .password : .newPassword)
                    .padding(12)
                    .background(.white.opacity(0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(.white)
                    .overlay(alignment: .topLeading) {
                        Text("Password")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.4))
                            .padding(.leading, 12)
                            .offset(y: -16)
                    }

                if let info {
                    Text(info)
                        .font(.footnote)
                        .foregroundStyle(.white.opacity(0.85))
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.accentColor.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red.opacity(0.9))
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button(action: submit) {
                    HStack {
                        if busy { ProgressView().tint(.white) }
                        Text(mode == .signIn ? "Sign in" : "Create account")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .disabled(busy)

                HStack {
                    Spacer()
                    Button(mode == .signIn ? "Need an account? Sign up" : "Have an account? Sign in") {
                        mode = mode == .signIn ? .signUp : .signIn
                        errorMessage = nil
                        info = nil
                    }
                    .foregroundStyle(.white.opacity(0.7))
                    .font(.footnote)
                    Spacer()
                }
            }
            .padding(24)
            .background(.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .padding(.horizontal, 24)
            Spacer(minLength: 0)
        }
    }

    private func submit() {
        Task {
            busy = true
            errorMessage = nil
            info = nil
            do {
                if mode == .signIn {
                    try await auth.signIn(email: email, password: password)
                } else {
                    try await auth.signUp(
                        email: email,
                        password: password,
                        firstName: firstName,
                        lastName: lastName
                    )
                    if auth.user == nil {
                        info = "Check your email for a confirmation link, then sign in."
                        mode = .signIn
                        password = ""
                    }
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            busy = false
        }
    }
}

private struct Field: View {
    let label: String
    @Binding var text: String
    var contentType: UITextContentType? = nil
    var keyboard: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.white.opacity(0.4))
                .tracking(1)
            TextField("", text: $text)
                .textContentType(contentType)
                .keyboardType(keyboard)
                .autocapitalization(keyboard == .emailAddress ? .none : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .padding(12)
                .background(.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(.white)
        }
    }
}
