import { Component, OnDestroy, OnInit } from '@angular/core';

import { DocumentSelectionService } from '../../services/document-selection.service';
import { FileDownloadClient } from '../../generated/backend-client';
import { FileSaverService } from '../../services/file-saver.service';
import { HttpClient } from '@angular/common/http';
import { JwtTokenService } from '@dangl/angular-dangl-identity-client';
import { merge, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { CdeClientHubService } from '../../services/cde-client-hub.service';
import {
  DocumentVersion,
  DocumentMetadata,
  DocumentVersions,
  SelectedDocuments,
} from '../../generated/open-cde-swagger/model/models';

@Component({
  selector: 'opencde-client-view-document',
  templateUrl: './view-document.component.html',
  styleUrls: ['./view-document.component.scss'],
  standalone: false,
})
export class ViewDocumentComponent implements OnInit, OnDestroy {
  isLoading = true;
  documentVersion: DocumentVersion | null = null;
  documentMetadata: DocumentMetadata | null = null;
  documentVersions: DocumentVersions | null = null;
  private unsubscribe: Subject<void> = new Subject<void>();

  constructor(
    private documentSelectionService: DocumentSelectionService,
    private http: HttpClient,
    private fileSaverService: FileSaverService,
    private fileDownloadClient: FileDownloadClient,
    private jwtTokenService: JwtTokenService,
    private cdeClientHubService: CdeClientHubService
  ) {}

  ngOnInit(): void {
    const getProxyUrl = (actualUrl: string) => {
      const accessToken =
        this.jwtTokenService.getTokenFromStorage().accessToken;
      return `/client-proxy?accessToken=${accessToken}&targetUrl=${encodeURIComponent(
        actualUrl
      )}`;
    };

    this.cdeClientHubService.documentVersionUploadResultReceived
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((documentVersion) => {
        this.isLoading = false;

        this.documentVersion = documentVersion;

        const metadataUrl =
          // TODO DELETE THIS WORKAROUND
          // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
          this.documentVersion!.links.document_version_metadata?.url ??
          (<any>this.documentVersion)!.links.metadata?.url;
        if (metadataUrl) {
          this.http
            .get<DocumentMetadata>(getProxyUrl(metadataUrl))
            .subscribe((metadata) => (this.documentMetadata = metadata));
        }

        const versionsUrl =
          // TODO DELETE THIS WORKAROUND
          // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
          this.documentVersion!.links.document_versions?.url ??
          (<any>this.documentVersion)!.links.versions?.url;
        if (versionsUrl) {
          this.http
            .get<DocumentVersions>(getProxyUrl(versionsUrl))
            .subscribe((versions) => (this.documentVersions = versions));
        }
      });

    this.documentSelectionService.referenceLink
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((documentReferenceUrl) => {
        this.isLoading = true;

        this.http
          .get<SelectedDocuments>(getProxyUrl(documentReferenceUrl))
          .subscribe((r) => {
            this.isLoading = false;

            if (r.documents && r.documents.length > 0) {
              this.documentVersion = r?.documents[0];
            } else if ((<any>r).document_references?.length > 0) {
              // TODO DELETE THIS WORKAROUND
              // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
              this.documentVersion = (<any>r).document_references[0];
            } else {
              this.documentMetadata = null;
              this.documentVersions = null;
              this.documentVersion = null;
              return;
            }

            const metadataUrl =
              // TODO DELETE THIS WORKAROUND
              // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
              this.documentVersion!.links.document_version_metadata?.url ??
              (<any>this.documentVersion)!.links.metadata?.url;
            if (metadataUrl) {
              this.http
                .get<DocumentMetadata>(getProxyUrl(metadataUrl))
                .subscribe((metadata) => (this.documentMetadata = metadata));
            }

            const versionsUrl =
              // TODO DELETE THIS WORKAROUND
              // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
              this.documentVersion!.links.document_versions?.url ??
              (<any>this.documentVersion)!.links.versions?.url;
            if (versionsUrl) {
              this.http
                .get<DocumentVersions>(getProxyUrl(versionsUrl))
                .subscribe((versions) => (this.documentVersions = versions));
            }
          });
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  downloadDocument(): void {
    if (!this.documentVersion) {
      return;
    }

    let downloadUrl =
      this.documentVersion?.links?.document_version_download?.url;
    if (!downloadUrl) {
      // TODO DELETE THIS WORKAROUND
      // This is a workaround for older servers that haven't implemented the latest spec, as of 05.10.2021
      downloadUrl = (<any>this.documentVersion)?.links?.download?.url;
    }
    if (downloadUrl) {
      this.fileDownloadClient.downloadFile(downloadUrl).subscribe((r) => {
        this.fileSaverService.saveFile(r.data, r.fileName ?? 'file');
      });
    } else {
      alert('Did not find a download url for the document.');
    }
  }
}
