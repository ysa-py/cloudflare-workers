use wasm_bindgen::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
pub struct VlessHeader {
    pub uuid: String,
    pub command: u8,
    pub address_type: u8,
    pub address: String,
    pub port: u16,
}

fn parse_ipv4(bytes: &[u8]) -> String {
    bytes.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(".")
}

fn parse_ipv6(bytes: &[u8]) -> String {
    let parts: Vec<String> = bytes.chunks(2).map(|chunk| {
        let hi = chunk.get(0).copied().unwrap_or(0) as u16;
        let lo = chunk.get(1).copied().unwrap_or(0) as u16;
        format!("{:x}", (hi << 8) | lo)
    }).collect();
    parts.join(":")
}

#[wasm_bindgen]
pub fn parse_vless_header(buf: &[u8]) -> Result<JsValue, JsValue> {
    if buf.len() < 24 {
        return Err(JsValue::from_str("buffer too small"));
    }

    // version at 0
    let _version = buf[0];

    // uuid bytes 1..17
    let uuid_bytes = &buf[1..17];
    // format uuid manually (hex with hyphens 8-4-4-4-12)
    let mut hex = String::with_capacity(32);
    for b in uuid_bytes {
        use std::fmt::Write;
        write!(&mut hex, "{:02x}", b).ok();
    }
    let uuid_str = format!("{}-{}-{}-{}-{}",
        &hex[0..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..32]
    );

    let payload_start = 17usize;
    if buf.len() <= payload_start {
        return Err(JsValue::from_str("invalid payload"));
    }

    let opt_len = buf[payload_start] as usize;
    let command_index = payload_start + 1 + opt_len;
    if buf.len() <= command_index {
        return Err(JsValue::from_str("invalid command index"));
    }

    let command = buf[command_index];
    if command != 1 && command != 2 {
        return Err(JsValue::from_str("unsupported command"));
    }

    let port_index = command_index + 1;
    if buf.len() < port_index + 2 {
        return Err(JsValue::from_str("missing port"));
    }
    let port = u16::from_be_bytes([buf[port_index], buf[port_index + 1]]);

    let address_type_index = port_index + 2;
    if buf.len() <= address_type_index {
        return Err(JsValue::from_str("missing address type"));
    }
    let address_type = buf[address_type_index];

    let mut address = String::new();
    let mut address_len = 0usize;
    let address_value_index: usize;

    match address_type {
        1 => {
            // IPv4: 4 bytes
            address_value_index = address_type_index + 1;
            if buf.len() < address_value_index + 4 { return Err(JsValue::from_str("ipv4 missing bytes")); }
            address = parse_ipv4(&buf[address_value_index..address_value_index+4]);
            address_len = 4;
        }
        2 => {
            // domain: length-prefixed
            if buf.len() < address_type_index + 2 { return Err(JsValue::from_str("domain length missing")); }
            let domain_len = buf[address_type_index + 1] as usize;
            address_value_index = address_type_index + 2;
            if buf.len() < address_value_index + domain_len { return Err(JsValue::from_str("domain bytes missing")); }
            match std::str::from_utf8(&buf[address_value_index..address_value_index+domain_len]) {
                Ok(s) => address = s.to_string(),
                Err(_) => return Err(JsValue::from_str("domain utf8 error")),
            }
            address_len = 1 + 1 + domain_len - 1; // approximate
        }
        3 => {
            // ipv6: 16 bytes
            address_value_index = address_type_index + 1;
            if buf.len() < address_value_index + 16 { return Err(JsValue::from_str("ipv6 missing bytes")); }
            address = parse_ipv6(&buf[address_value_index..address_value_index+16]);
            address_len = 16;
        }
        _ => return Err(JsValue::from_str("invalid address type")),
    }

    let hdr = VlessHeader {
        uuid: uuid_str,
        command,
        address_type,
        address,
        port,
    };

    match serde_json::to_string(&hdr) {
        Ok(json_str) => Ok(JsValue::from_str(&json_str)),
        Err(e) => Err(JsValue::from_str(&format!("serialize error: {}", e))),
    }
}
