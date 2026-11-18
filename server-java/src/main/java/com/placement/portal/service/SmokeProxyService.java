package com.placement.portal.service;

import org.springframework.stereotype.Service;

@Service
public class SmokeProxyService {
    public String testProxy() {
        return "PROXY_ACTIVE";
    }
}

