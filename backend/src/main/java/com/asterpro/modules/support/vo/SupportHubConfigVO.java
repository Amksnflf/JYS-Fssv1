package com.asterpro.modules.support.vo;

import lombok.Data;

@Data
public class SupportHubConfigVO {
    private boolean enabled;
    private String mode;
    private String vendor;
    private boolean helpCenterEnabled;
    private boolean ticketEnabled;
    private boolean thirdPartyEnabled;
    private String thirdPartyType;
    private String thirdPartyUrl;
    private String thirdPartyScript;
    private String thirdPartyAppId;
    private boolean fallbackToTicket;
}
