import { Component, OnInit } from '@angular/core';

import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'opencde-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  processingLoginResponse = true;
  errorMessage: string | null = null;
  error = false;

  constructor(private authenticationService: AuthenticationService) {}

  ngOnInit(): void {
    this.authenticationService
      .processSignInResponse()
      .subscribe((loginResponse) => {
        this.processingLoginResponse = false;

        if (!loginResponse.success) {
          this.error = true;
          this.errorMessage = loginResponse.error ?? null;
        }
      });
  }
}
